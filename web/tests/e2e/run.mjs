// End-to-end check of a real production build against a stand-in CMS.
//
//   npm run test:e2e              both builds (shop open, then "Coming Soon")
//   npm run test:e2e -- --open    one build only (or --closed)
//
// Stop `npm run dev` first: both use the .next folder.
//
// Each run builds the site, starts `next start` on a spare port and checks
// every page and internal link, the images, redirects, robots.txt, the
// sitemap and the API routes, plus the content that matters: drafts stay
// hidden, Chapters and Events read right, prices show, forms reach the CMS.
//
// Every value from the .env files is blanked for the run, so nothing can
// reach the real CMS, Stripe, Gelato, Qikink or the mailbox.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDirectus } from '../support/mocks.mjs';
import { FILES, seed } from '../support/fixtures.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const NEXT_BIN = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
const CMS_PORT = Number(process.env.E2E_CMS_PORT || 8099);
const SITE_PORT = Number(process.env.E2E_PORT || 3099);
const BASE = `http://127.0.0.1:${SITE_PORT}`;
const SITE_URL = 'https://stage.antisocialtalks.com';

const MODES = process.argv.includes('--open') ? ['open'] : process.argv.includes('--closed') ? ['closed'] : ['open', 'closed'];

/* ───────────────────────────── the stand-in CMS ───────────────────────────── */

function serveCms() {
  const cms = createDirectus(seed());
  const server = createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const hasBody = !['GET', 'HEAD'].includes(req.method);
      const request = new Request(`http://127.0.0.1:${CMS_PORT}${req.url}`, {
        method: req.method,
        headers: req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {},
        body: hasBody ? Buffer.concat(chunks) : null,
      });
      const response = await cms.handle(request);
      res.writeHead(response.status, { 'content-type': response.headers.get('content-type') || 'application/json' });
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  return new Promise((resolve) => server.listen(CMS_PORT, '127.0.0.1', () => resolve({ cms, server })));
}

/* ───────────────────────────── building and serving ───────────────────────────── */

/** Every key named in a local .env file, so the run can blank them. */
function envKeys() {
  const keys = new Set([
    'MS_TENANT_ID', 'MS_CLIENT_ID', 'MS_CLIENT_SECRET', 'MAIL_FROM', 'RESEND_API_KEY', 'TEAM_NOTIFY_EMAIL', 'CRON_SECRET',
    'GELATO_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'QIKINK_CLIENT_ID', 'QIKINK_CLIENT_SECRET',
  ]);
  for (const file of readdirSync(ROOT)) {
    if (!file.startsWith('.env') || file.endsWith('.example')) continue;
    for (const line of readFileSync(join(ROOT, file), 'utf8').split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
      if (m) keys.add(m[1]);
    }
  }
  return keys;
}

function siteEnv(mode) {
  const env = { ...process.env };
  // An empty value in the environment wins over the .env files.
  for (const key of envKeys()) env[key] = '';
  return Object.assign(env, {
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    DIRECTUS_URL: `http://127.0.0.1:${CMS_PORT}`,
    DIRECTUS_TOKEN: 'e2e-token',
    NEXT_PUBLIC_SITE_URL: SITE_URL,
    NEXT_PUBLIC_SHOP_OPEN: mode === 'open' ? 'true' : 'false',
    PAYMENT_GATEWAY: 'none',
  });
}

function next(args, env) {
  const child = spawn(process.execPath, [NEXT_BIN, ...args], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  return { child, log: () => log };
}

async function build(env) {
  const started = Date.now();
  const { child, log } = next(['build'], env);
  const code = await new Promise((resolve) => child.on('exit', resolve));
  if (code !== 0) throw new Error(`next build failed (${code}):\n${log().slice(-4000)}`);
  console.log(`  built in ${Math.round((Date.now() - started) / 1000)}s`);
  return log();
}

async function start(env) {
  const server = next(['start', '-p', String(SITE_PORT), '-H', '127.0.0.1'], env);
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) throw new Error(`next start exited:\n${server.log()}`);
    try {
      if ((await fetch(`${BASE}/robots.txt`)).ok) return server;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  server.child.kill();
  throw new Error(`next start did not answer within a minute:\n${server.log()}`);
}

/* ───────────────────────────── reading pages ───────────────────────────── */

async function get(path, init = {}) {
  // A request that hangs is a failure in its own right, not a five-minute wait.
  const res = await fetch(BASE + path, { redirect: 'manual', signal: AbortSignal.timeout(20_000), ...init }).catch((err) => {
    throw new Error(`${init.method || 'GET'} ${path}: ${err.name === 'TimeoutError' ? 'no answer within 20s' : err.message}`);
  });
  const body = await res.text();
  return { status: res.status, body, location: res.headers.get('location'), type: res.headers.get('content-type') || '', headers: res.headers };
}

const decode = (s) =>
  s.replace(/&nbsp;/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** What a visitor reads: no scripts, styles, tags or React's text separators. */
function textOf(html) {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');
}

function linksOf(html) {
  const out = new Set();
  for (const m of html.matchAll(/<a\b[^>]*?\shref="([^"]+)"/g)) {
    const href = decode(m[1]);
    if (href.startsWith('/') && !href.startsWith('//')) out.add(href.split('#')[0].split('?')[0] || '/');
  }
  return [...out];
}

function assetsOf(html) {
  const out = new Set();
  for (const m of html.matchAll(/\s(?:src|poster)="(\/[^"]+)"/g)) out.add(decode(m[1]));
  for (const m of html.matchAll(/\ssrcSet="([^"]+)"|\ssrcset="([^"]+)"/g)) {
    for (const part of decode(m[1] || m[2]).split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (url.startsWith('/')) out.add(url);
    }
  }
  return [...out];
}

const count = (html, re) => (html.match(re) || []).length;

/* ───────────────────────────── checks ───────────────────────────── */

const results = [];
async function check(name, fn) {
  const started = Date.now();
  const took = () => `(${((Date.now() - started) / 1000).toFixed(1)}s)`;
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✔ ${name} ${took()}`);
  } catch (err) {
    results.push({ name, ok: false });
    const cause = err.cause ? `\n(cause: ${err.cause.code || ''} ${err.cause.message || err.cause})` : '';
    console.log(`  ✖ ${name} ${took()}\n      ${`${err.message || err}${cause}`.split('\n').join('\n      ')}`);
  }
}
function expect(condition, message) {
  if (!condition) throw new Error(message);
}
function expectAll(problems, what) {
  if (problems.length) throw new Error(`${problems.length} ${what}:\n${problems.slice(0, 25).join('\n')}`);
}

const START_PAGES = [
  '/', '/about', '/episodes', '/voices', '/stories', '/community', '/roadshow',
  '/chapters', '/chapters/start', '/chapters/organise', '/chapters/become-a-leader', '/chapters/what-happens',
  '/chapters/how-to-start', '/chapters/discover-talent', '/chapters/how-to-organise',
  '/chapters/apply/speak', '/chapters/apply/local-team', '/chapters/apply/partner',
  '/events', '/shop', '/cart', '/checkout', '/terms', '/privacy', '/payment/complete',
];

async function crawl() {
  const pages = new Map();
  const queue = [...START_PAGES];
  while (queue.length && pages.size < 400) {
    const path = queue.shift();
    if (pages.has(path)) continue;
    const page = await get(path);
    pages.set(path, page);
    if (page.status === 200 && page.type.includes('text/html')) {
      for (const link of linksOf(page.body)) if (!pages.has(link)) queue.push(link);
    }
  }
  return pages;
}

async function runChecks(mode, cms) {
  const open = mode === 'open';
  const pages = await crawl();
  const html = (path) => pages.get(path)?.body || '';
  const text = (path) => textOf(html(path));
  const redirectsTo = (path, target) => {
    const page = pages.get(path);
    return page && [307, 308].includes(page.status) && new URL(page.location, BASE).pathname === target;
  };

  await check(`every page and internal link answers (${pages.size} pages)`, async () => {
    const problems = [];
    for (const [path, page] of pages) {
      if (page.status === 200) continue;
      if ([307, 308].includes(page.status) && page.location) {
        const target = await get(new URL(page.location, BASE).pathname);
        if (target.status === 200) continue;
        problems.push(`${path} -> ${page.location} -> ${target.status}`);
      } else problems.push(`${path} -> ${page.status}`);
    }
    expectAll(problems, 'broken');
  });

  await check('every page has a title, a description, one h1 and lang="en"', () => {
    const problems = [];
    for (const [path, page] of pages) {
      if (page.status !== 200 || !page.type.includes('text/html')) continue;
      const title = /<title>([^<]*)<\/title>/.exec(page.body)?.[1];
      if (!title?.trim()) problems.push(`${path}: no <title>`);
      const description = /<meta name="description" content="([^"]*)"/.exec(page.body)?.[1];
      if (!description) problems.push(`${path}: no meta description`);
      else if (decode(description).length > 160) problems.push(`${path}: meta description is ${decode(description).length} characters`);
      const h1 = count(page.body, /<h1[\s>]/g);
      if (h1 !== 1) problems.push(`${path}: ${h1} <h1>`);
      if (!/<html[^>]*\slang="en"/.test(page.body)) problems.push(`${path}: no lang`);
    }
    expectAll(problems, 'pages with problems');
  });

  await check('share cards: each page its own title, description, picture and address; icons', async () => {
    const problems = [];
    const pathOf = (url) => new URL(url, BASE).pathname.replace(/(.)\/$/, '$1');
    for (const [path, page] of pages) {
      if (page.status !== 200 || !page.type.includes('text/html')) continue;
      const tag = (attr, name) => new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`).exec(page.body)?.[1];
      const title = /<title>([^<]*)<\/title>/.exec(page.body)?.[1];
      const canonical = /<link rel="canonical" href="([^"]*)"/.exec(page.body)?.[1];
      if (!tag('property', 'og:image')) problems.push(`${path}: no og:image`);
      if (!tag('property', 'og:description')) problems.push(`${path}: no og:description`);
      if (!tag('name', 'twitter:image')) problems.push(`${path}: no twitter:image`);
      // The home page and an event's page word their own share card; every other page shares its title.
      if (path !== '/' && !path.startsWith('/events/') && tag('property', 'og:title') !== title) {
        problems.push(`${path}: og:title “${tag('property', 'og:title')}” is not the page title “${title}”`);
      }
      // A canonical pointing anywhere else tells search engines this page is a copy of that one.
      if (canonical && pathOf(canonical) !== (path.split('?')[0].replace(/(.)\/$/, '$1') || '/')) problems.push(`${path}: canonical is ${canonical}`);
    }
    for (const path of ['/', '/shop', '/events', '/voices', '/about', '/stories', '/chapters', '/episodes', '/community', '/roadshow']) {
      const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html(path))?.[1];
      if (!canonical || pathOf(canonical) !== path) problems.push(`${path}: canonical should be its own address, is ${canonical}`);
    }
    expectAll(problems, 'pages with share-card problems');

    const home = html('/');
    expect(/<meta property="og:title" content="They called us AntiSocial\. We decided to talk\."/.test(home), 'the home page share card lost its line');
    expect(/<meta property="og:image" content="[^"]*\/og-image\.jpg"/.test(home), 'the home page share card has no picture');
    expect(/<meta property="og:image" content="[^"]*\/api\/assets\/[^"]*format=jpg/.test(html('/shop/tee-anti-bullshit')), 'a shared product should show its own photo');
    expect(new RegExp(`<meta property="og:image" content="[^"]*${FILES.mockup}[^"]*format=jpg`).test(html('/voices/abdu-rozik')), 'a shared voice should show their photo');
    expect(/<link rel="icon" href="\/favicon\.ico/.test(home) && /<link rel="icon" href="\/icon\.png/.test(home) && /<link rel="apple-touch-icon" href="\/apple-icon\.png/.test(home), 'the page does not link its icons');
    expect(/<link rel="manifest" href="\/manifest\.webmanifest"/.test(home) && /<meta name="theme-color" content="#0b0b0c"/.test(home), 'no manifest or theme colour');
    for (const [path, type] of [['/favicon.ico', 'image/x-icon'], ['/icon.png', 'image/png'], ['/apple-icon.png', 'image/png'], ['/og-image.jpg', 'image/jpeg'], ['/icon-192.png', 'image/png'], ['/manifest.webmanifest', 'application/manifest+json']]) {
      const r = await get(path);
      expect(r.status === 200 && r.type.includes(type), `${path}: ${r.status} ${r.type}`);
    }
    const manifest = JSON.parse((await get('/manifest.webmanifest')).body);
    expect(manifest.icons?.length === 2 && manifest.name === 'AntiSocialTalks', 'the manifest has no name or icons');
  });

  await check('no em dashes in what visitors read', () => {
    const problems = [];
    for (const [path, page] of pages) {
      if (page.status !== 200 || !page.type.includes('text/html')) continue;
      const t = textOf(page.body);
      const i = t.indexOf('—');
      if (i >= 0) problems.push(`${path}: “…${t.slice(Math.max(0, i - 50), i + 30)}…”`);
    }
    expectAll(problems, 'pages with an em dash');
  });

  await check('every image and script on those pages loads', async () => {
    const assets = new Set();
    for (const page of pages.values()) if (page.status === 200) for (const a of assetsOf(page.body)) assets.add(a);
    const problems = [];
    for (const asset of assets) {
      const res = await get(asset);
      if (res.status !== 200) problems.push(`${asset} -> ${res.status}`);
    }
    expect(assets.size > 10, `only ${assets.size} assets found`);
    expectAll(problems, `of ${assets.size} assets broken`);
  });

  await check('home: the redesign brief (Nov 2026): sections, backgrounds, words and buttons', () => {
    const t = text('/');
    const home = html('/');

    // The brief's order and background rhythm: black hero / intro / episode / voices, white
    // Chapters, black topics, light exploration cards, black closing call.
    const order = ['hero-title', 'About AntiSocial Talks', 'featured-title', 'guests-title', 'chapters-title', 'topics-title', 'explore-title', 'final-title'];
    const at = order.map((id) => home.indexOf(id.includes(' ') ? `aria-label="${id}"` : `aria-labelledby="${id}"`));
    expect(at.every((i, k) => i > 0 && (k === 0 || i > at[k - 1])), `home sections out of order: ${order.map((id, k) => `${id}@${at[k]}`).join(', ')}`);
    const sectionOf = (k) => home.slice(home.lastIndexOf('<section', at[k]), at[k + 1] ? home.lastIndexOf('<section', at[k + 1]) : undefined);
    const bg = (k) => /<section[^>]*class="[^"]*\b(bg-ink|bg-white|bg-paper|bg-cream-deep|bg-cream)\b/.exec(sectionOf(k))?.[1];
    const backgrounds = order.map((_, k) => bg(k));
    expect(JSON.stringify(backgrounds) === JSON.stringify(['bg-ink', 'bg-ink', 'bg-ink', 'bg-ink', 'bg-white', 'bg-ink', 'bg-paper', 'bg-ink']), `home backgrounds: ${backgrounds}`);
    expect(!home.includes('aria-label="Mission and vision"'), 'Mission and Vision is still on the home page');
    expect(!home.includes('question-title'), 'The AntiSocial Question is no longer part of the home page');

    // Hero: no photograph, the four lines (typed in turn; all of them for screen readers), Listen Now and Start a Chapter (to /chapters).
    const hero = sectionOf(0);
    expect(/They called\s+us\s+AntiSocial\.\s+We decided to\s+talk\./.test(textOf(hero)) && textOf(hero).includes('Not anti-society. Anti-silence.'), 'the hero lines are missing');
    expect(!/<img\b/.test(hero), 'the hero should have no photograph');
    expect(/href="\/episodes"[^>]*>[\s\S]*?Listen Now/.test(hero) && /href="\/chapters"[^>]*>Start a Chapter/.test(hero), 'hero buttons: Listen Now to /episodes, Start a Chapter to /chapters');
    expect(!textOf(hero).includes('Join the Community'), 'the hero still offers Join the Community');

    // Introduction: its own section directly below the hero, the client's three paragraphs (Home page → Introduction).
    const intro = sectionOf(1);
    for (const s of ['AntiSocial Talks is a global conversation and media platform', 'for honest conversations about the issues', 'beyond the screen and into communities around the world.']) {
      expect(textOf(intro).includes(s), `introduction: missing “${s}”`);
      expect(!textOf(hero).includes(s), 'the introduction belongs below the hero, not inside it');
    }

    // Latest Episode: the line, the title (to its page), Watch Episode (the video) and Subscribe on YouTube.
    const episode = sectionOf(2);
    for (const s of ['Latest Episode', 'The conversations people usually avoid.', 'Second Test Episode | AntiSocialTalks Ep. 2', 'Released 4 November 2026', 'With Abdu Rozik', 'Watch Episode', 'Subscribe on YouTube']) {
      expect(textOf(episode).includes(s), `home episode: missing “${s}”`);
    }
    expect(episode.includes('href="https://www.youtube.com/watch?v=AbCdEfGh002"'), 'Watch Episode does not open that episode');
    expect(episode.includes('href="/episodes/second-test-episode-antisocialtalks-ep-2"'), 'the episode title does not open its page');
    for (const s of ['Listen on Spotify', 'All About This Episode', 'Watch on YouTube']) expect(!textOf(episode).includes(s), `home episode still shows “${s}”`);
    for (const s of ['Episode 01: The AntiSocial Question', 'Out 1 January', 'Knock knock.']) expect(!t.includes(s), `home still shows “${s}”`);

    // Voices.
    for (const s of ['Meet the Voices', 'They’ve been interviewed before. Not like this.', 'Abdu Rozik', 'Gauri G', 'to challenge perspectives and explore the stories behind the headlines.']) expect(textOf(sectionOf(3)).includes(s), `voices: missing “${s}”`);
    expect(sectionOf(3).includes('href="/voices"'), 'voices: Meet the Voices button');
    expect(!t.includes('Hidden Guest'), 'a draft guest is shown');

    // Chapters: the map, Explore Chapters and Start a Chapter (to /chapters/start).
    const chapters = sectionOf(4);
    expect(textOf(chapters).includes('Beyond the Screen.') && textOf(chapters).includes('Different cities, different voices, one conversation.'), 'the Chapters words are missing');
    expect(chapters.includes('href="/chapters"') && chapters.includes('href="/chapters/start"'), 'Chapters buttons: Explore to /chapters, Start to /chapters/start');
    expect(/role="img" aria-label="World map[^"]*Dubai, India and the USA"/.test(chapters), 'the Chapters map is missing');

    // Topics: the ten from the brief, no descriptions, not links.
    const topics = textOf(sectionOf(5));
    expect(topics.includes('Big topics. Deeper conversations.'), 'topics heading');
    for (const s of ['Nothing is off the table.', 'Human', 'Health', 'Science', 'Technology', 'Business', 'Society', 'The Future', 'Identity', 'Money', 'Belief']) expect(topics.includes(s), `topics: missing “${s}”`);
    expect(!topics.includes('Most conversations end where the answer begins'), 'topics: the old paragraph is still there');
    expect(!home.includes('href="/episodes?topic='), 'home topics should not link to episodes');

    // The three cards, the closing call, the footer lines.
    const cards = sectionOf(6);
    for (const s of ['AntiSocial Stories', 'Stories from people who rarely get asked.', 'Explore Stories', 'AntiSocial Events', 'Explore Events', 'The AntiSocial Shop', 'Wear the conversation.', 'Shop the Drop']) expect(textOf(cards).includes(s), `Explore cards: missing “${s}”`);
    expect(['href="/stories"', 'href="/events"', 'href="/shop"'].every((h) => cards.includes(h)) && !cards.includes('href="/chapters"'), 'Explore cards: Stories, Events and Shop only');
    expect(t.includes('Socially Unfiltered.') && !t.includes('Socially Unfiltered!'), 'Events card line');
    const final = sectionOf(7).split('<footer')[0];
    expect(textOf(final).includes('Ready to speak up?') && textOf(final).includes('The next conversation could start with you.'), 'the closing words are missing');
    for (const [label, href] of [['Tell Your Story', '/community/story'], ['Suggest a Speaker', '/community/speaker'], ['Start a Chapter', '/chapters']]) {
      expect(new RegExp(`href="${href}"[^>]*>${label}`).test(final), `closing call: “${label}” should open ${href}`);
    }
    expect(!textOf(final).includes('Submit a Question') && !textOf(final).includes('Think differently.'), 'the closing call still has Submit a Question or the footer lines');
    const footer = textOf(home.slice(home.lastIndexOf('<footer')));
    expect(footer.includes('Think differently.') && footer.includes('Talk openly.') && footer.includes('Not anti-society. Anti-silence.'), 'the footer lines are missing');
  });

  await check('episodes: released ones with Watch and Listen, Coming Soon without, no empty filters, the old Episode 01 gone', async () => {
    const list = text('/episodes');
    const listHtml = html('/episodes');
    for (const s of ['Real Talk: First Test Episode | AntiSocialTalks', 'Second Test Episode | AntiSocialTalks Ep. 2', 'Coming Test Episode', 'With Abdu Rozik', 'Coming Soon', 'Nov 4, 2026', 'Oct 28, 2026']) {
      expect(list.includes(s), `episodes page: missing “${s}”`);
    }
    expect(!list.includes('The AntiSocial Question'), 'the archived episode is listed');
    const filters = [...listHtml.matchAll(/href="\/episodes\?topic=([a-z-]+)"/g)].map((m) => m[1]).sort();
    expect(JSON.stringify(filters) === JSON.stringify(['health', 'society']), `only topics with episodes get a filter: ${filters}`);
    // The crawl drops query strings, so the filtered list is fetched on its own.
    const health = textOf((await get('/episodes?topic=health')).body);
    expect(health.includes('Real Talk: First Test Episode') && !health.includes('Second Test Episode'), 'the Health filter does not show just its episode');

    const released = html('/episodes/second-test-episode-antisocialtalks-ep-2');
    for (const s of ['href="https://www.youtube.com/watch?v=AbCdEfGh002"', 'href="https://open.spotify.com/episode/TestSpotify002"']) {
      expect(released.includes(s), `released episode page: missing ${s}`);
    }
    for (const s of ['Watch on YouTube', 'Listen on Spotify', 'With Abdu Rozik']) expect(textOf(released).includes(s), `released episode page: missing “${s}”`);
    const coming = text('/episodes/coming-test-episode');
    expect(coming.includes('Coming Soon') && !coming.includes('Watch on YouTube') && !coming.includes('Listen on Spotify'), 'an unreleased episode offers Watch or Listen');
    expect((await get('/episodes/episode-01-the-antisocial-question')).status === 404, 'the archived episode still has a page');

    // Voices: no button to an archived episode; a renamed voice's old address forwards.
    expect(!/See the episode|Watch the episode/.test(text('/voices/gauri-g')), 'a voice links to the archived episode');
    expect(text('/voices/abdu-rozik').includes('Watch the episode'), 'a voice does not link to their released episode');
    // On its first render Next.js sends the same Location twice (browsers take it); read the first.
    const moved = await get('/voices/reem-elkott');
    const to = (moved.location || '').split(',')[0].trim();
    expect([307, 308].includes(moved.status) && new URL(to || '/', BASE).pathname === '/voices/reem-elkot', `the old Reem Elkott address should forward: ${moved.status} ${moved.location}`);

    // The official profiles, as the team listed them.
    const footer = html('/');
    for (const href of ['https://www.tiktok.com/@antisocialtalks', 'https://open.spotify.com/show/66DmoJEVAPPMU2Sfpi3FAA']) {
      expect(footer.includes(`href="${href}"`), `missing the profile link ${href}`);
    }
    expect(!footer.includes('@antisocial.talks'), 'the old TikTok handle is still linked');
  });

  await check('chapters: Dubai, USA, India in that order; founder questions; guides', () => {
    const t = text('/chapters');
    const order = ['Dubai', 'USA', 'India'].map((c) => t.indexOf(`The podcast, recorded ${c === 'Dubai' ? 'in Dubai' : c === 'USA' ? 'in the USA' : 'across India'}`));
    expect(order.every((i) => i > 0), `chapter cards missing: ${order}`);
    expect(order[0] < order[1] && order[1] < order[2], 'chapters are not in Dubai, USA, India order');
    expect(t.includes('Five questions to apply.'), 'no founder questions');
  });

  await check('events: published events listed, the draft hidden, prices and capacity right', () => {
    const t = text('/events');
    for (const s of ['Dubai Event', 'Paid Talk', 'Coming Soon Talk']) expect(t.includes(s), `missing “${s}”`);
    expect(!t.includes('India: Upcoming Chapter Event'), 'the draft India event is listed');
    expect(text('/events/paid-talk').includes('₹499'), 'no ticket price on the paid event');
    const rsvp = text('/events/invitation-talk');
    for (const s of ['RSVP Open', 'RSVP for the Event', 'Send My RSVP', 'Organisation', 'Shared on RSVP confirmation']) {
      expect(rsvp.includes(s), `invitation event: missing “${s}”`);
    }
    expect(!rsvp.includes('Number of attendees'), 'invitation event asks for a head count');
    // A date without a start time: the date shows, the time doesn't; blank lines make paragraphs.
    const dateOnly = text('/events/date-only-talk');
    expect(dateOnly.includes('3 Nov 2099') && dateOnly.includes('Time to be announced') && !/12:00\s*AM/.test(dateOnly), 'the date-only event shows a made-up time');
    expect(/<p[^>]*>First paragraph\.<\/p><p[^>]*>Second paragraph\.<\/p>/.test(html('/events/date-only-talk')), 'the description should be two paragraphs');
    // An event's poster: whole on its page, on its card, and as the shared-link preview.
    const posterPage = html('/events/date-only-talk');
    expect(posterPage.includes('alt="Date Only Talk poster"') && posterPage.includes(FILES.photo), 'the poster is missing from the event page');
    expect(new RegExp(`<meta property="og:image" content="[^"]*${FILES.photo}[^"]*format=jpg`).test(posterPage), 'a shared event link should preview its poster');
    expect(html('/events').includes('alt="Date Only Talk poster"'), 'the poster is missing from the event card');
    // The events page: the next one counts down, a schedule row per event, the cards' parts from the CMS.
    const list = text('/events');
    for (const s of ['No small talk.', 'Next Up', 'Private · Invite Only', 'Organised by', 'Dr. Anmol Kapoor', 'Rishika Sharma', 'Goodies for every guest.',
      'Details Soon', 'Details coming soon', 'We are still shaping this one.',
      'Think You Belong in the Room? Write to Us', 'Reserve Your Spot', 'The main character', 'What you get', 'Early bird access', 'Not anti-society.']) {
      expect(list.includes(s), `events page: missing “${s}”`);
    }
    // Invite only: the page tells you how to attend and has no public form.
    const priv = text('/events/private-talk');
    for (const s of ['Private Event', 'Invite Only', '11:30 AM – 3:00 PM GMT', 'The People Behind It', 'Brings the people together.',
      'Not a panel', 'Longevity', 'Only the real stuff.', 'This is a private event.', 'Write to Us', 'Change the world.']) {
      expect(priv.includes(s), `invite-only event: missing “${s}”`);
    }
    expect(!html('/events/private-talk').includes('name="accepted_terms"'), 'an invite-only event shows the registration form');
    // The people behind it: profiles already on the site, with their titles, photos and links.
    const privHtml = html('/events/private-talk');
    for (const s of ['Founder &amp; Chairman', 'href="/voices/dr-anmol-kapoor"', 'href="/about#hosts"', 'alt="Rishika Sharma"', FILES.mockup,
      'href="https://www.bioaro.com"', 'The intelligence layer', 'alt="BioAro logo"', FILES.galleryPhoto]) {
      expect(privHtml.includes(s), `invite-only event people: missing “${s}”`);
    }
    for (const s of ['See Profile', 'Meet the Hosts', 'Visit BioAro']) expect(priv.includes(s), `invite-only event people: missing “${s}”`);
    expect(html('/about').includes('id="hosts"'), 'the hosts section on About needs id="hosts" for the event links');
    // Details soon: the card and the page point to the community; no form, no programme, no register button.
    const soon = text('/events/soon-talk');
    for (const s of ['Details Soon', 'Details Coming Soon', 'We are still shaping this one.', 'Join the Community']) {
      expect(soon.includes(s), `details-soon event: missing “${s}”`);
    }
    expect(!html('/events/soon-talk').includes('name="accepted_terms"'), 'a details-soon event shows the registration form');
    for (const s of ['Panel at noon', 'Book This Seat']) {
      expect(!soon.includes(s) && !list.includes(s), `a details-soon event shows “${s}”`);
    }
    expect(!soon.includes('Shared on RSVP confirmation'), 'a details-soon event shows a venue line meant for RSVPs');
    expect(!list.includes('Reserve now.'), 'a details-soon card shows its ticket note');
    // Early bird: the form with its own note and button, and no made-up time.
    const early = text('/events/early-bird-talk');
    for (const s of ['Early Bird Open', 'Early bird registration is open', 'Reserve Your Spot', 'Time to be announced', 'Early Bird Registration',
      'AntiSocialTalks comes to', 'Live talk show', 'Dubai, UAE', 'Talk show · Music', 'What’s in the Room', 'Become a member', 'Every night has one.',
      'A night of real talk.', 'Challenge conventional', 'Early Bird Talk, live talk show']) {
      expect(early.includes(s), `early-bird event: missing “${s}”`);
    }
    expect(/<h1[^>]*>Dubai<\/h1>/.test(html('/events/early-bird-talk')), 'the headline should replace the title at the top');
    expect(!early.includes('Change the world.'), 'the event’s own closing line should replace the default');
    expect(pages.get('/events/india-upcoming-chapter-event')?.status !== 200, 'the draft event page is reachable');
  });

  await check('private invitation page: only with its code, never indexed, its details only in the email', async () => {
    const path = '/invite/private-talk-invite-7k2m';
    const invite = await get(path);
    expect(invite.status === 200, `the invitation page answers ${invite.status}`);
    const t = textOf(invite.body);
    for (const s of ['Private Invitation', 'You’re invited to', 'Private Talk', 'Big questions.', 'Accept Your Invitation', 'In your invitation email',
      '11:30 AM – 3:00 PM GMT', 'The People Behind It', 'Dr. Anmol Kapoor', 'Goodies for every guest.']) {
      expect(t.includes(s), `invitation page: missing “${s}”`);
    }
    expect(/<meta name="robots" content="noindex, nofollow/.test(invite.body), 'the invitation page must carry noindex');
    expect((invite.body.match(/<h1[\s>]/g) || []).length === 1 && /<title>[^<]+<\/title>/.test(invite.body), 'the invitation page needs one h1 and a title');
    expect(invite.body.includes('name="accepted_terms"') && invite.body.includes('Accept Invitation'), 'the invitation page has no form');
    // Next.js skips scrolling to a sticky element, so a "#…" button whose target is sticky does nothing on desktop.
    for (const [where, body, target] of [[path, invite.body, 'accept'], ['/events/early-bird-talk', html('/events/early-bird-talk'), 'register']]) {
      const tag = new RegExp(`<[^>]*id="${target}"[^>]*>`).exec(body)?.[0] || '';
      expect(tag && !/\bsticky\b/.test(tag), `${where}: the #${target} link target must exist and not be sticky (${tag})`);
    }
    expect(!t.includes('the team reviews every RSVP'), 'the invitation form should not say RSVPs are reviewed');
    for (const wrong of ['/invite/private-talk-invite-0000', '/invite/short']) {
      expect((await get(wrong)).status === 404, `${wrong} should be 404`);
    }
    // The venue, the note and the code stay out of every page.
    for (const [where, body] of [[path, invite.body], ['/events/private-talk', html('/events/private-talk')], ['/events', html('/events')]]) {
      for (const secret of ['The Secret Room', 'Arrive by 11:15']) expect(!body.includes(secret), `${where} shows the invitation-only “${secret}”`);
    }
    for (const where of ['/events/private-talk', '/events', '/']) {
      expect(!html(where).includes('private-talk-invite-7k2m'), `${where} leaks the invitation code`);
    }
    expect(![...pages.keys()].some((p) => p.startsWith('/invite/')), 'a page on the site links to an invitation');
  });

  await check('a past event: completed by its date, under Past Events, no form, no invitation, not in the description', async () => {
    const list = html('/events');
    const pastAt = list.indexOf('id="past"');
    const cardAt = list.indexOf('id="past-talk"');
    expect(pastAt > 0 && cardAt > pastAt, 'the past event is not under Past Events');
    expect(list.indexOf('id="private-talk"') < pastAt && list.indexOf('id="early-bird-talk"') < pastAt, 'an upcoming event is under Past Events');
    const schedule = list.slice(list.indexOf('aria-label="Upcoming events"'));
    expect(!schedule.slice(0, schedule.indexOf('</ul>')).includes('Lisbon'), 'the past event is in the upcoming schedule');
    const card = textOf(list.slice(cardAt, list.indexOf('</article>', cardAt)));
    for (const s of ['Completed', 'This conversation has happened.', 'See Full Event Details']) expect(card.includes(s), `past event card: missing “${s}”`);
    for (const s of ['Old goodies', 'Yesterday’s access', 'Old secret', 'Your link to the past', 'Write to Us', 'Private Event']) {
      expect(!card.includes(s), `past event card still shows “${s}”`);
    }
    const description = /<meta name="description" content="([^"]*)"/.exec(list)?.[1] || '';
    expect(description.includes('Dubai') && !description.includes('Lisbon'), `the events description should name only upcoming cities: ${description}`);

    const page = text('/events/past-talk');
    for (const s of ['Completed', 'This conversation has happened.', 'Missed It?', 'There will be a next one.', 'Join the Community']) {
      expect(page.includes(s), `past event page: missing “${s}”`);
    }
    for (const s of ['A guest from the past.', 'This is a private event.', 'Registration is closed.']) expect(!page.includes(s), `past event page still shows “${s}”`);
    expect(!html('/events/past-talk').includes('name="accepted_terms"'), 'a past event shows a form');

    const invite = await get('/invite/past-talk-invite-3n8q');
    expect(invite.status === 200, `the old invitation link answers ${invite.status}`);
    const t = textOf(invite.body);
    for (const s of ['You were invited to', 'This conversation has happened.', 'This invitation has closed.', 'Join the community']) {
      expect(t.includes(s), `old invitation: missing “${s}”`);
    }
    for (const s of ['Accept Your Invitation', 'Old goodies', 'This page is only for the people we have invited']) expect(!t.includes(s), `old invitation still shows “${s}”`);
    expect(!invite.body.includes('name="accepted_terms"'), 'an old invitation still has the form');
  });

  await check('drafts and unknown slugs are 404', async () => {
    const problems = [];
    for (const path of [
      '/events/india-upcoming-chapter-event', '/shop/retired', '/voices/hidden-guest', '/episodes/nope',
      '/chapters/apply/organise', '/chapters/apply/start', '/community/nope', '/chapters/nowhere', '/no-such-page',
    ]) {
      const page = await get(path);
      if (page.status !== 404) problems.push(`${path} -> ${page.status}`);
    }
    expectAll(problems, 'should be 404');
  });

  await check('old URLs redirect', async () => {
    const problems = [];
    for (const [from, to] of [
      ['/antisocial-100', '/voices'], ['/guests', '/voices'], ['/guests/abdu-rozik', '/voices/abdu-rozik'], ['/live', '/chapters'],
      ['/live/dubai', '/chapters/dubai'], ['/chapters/events/dubai-upcoming-chapter-event', '/events/dubai-upcoming-chapter-event'],
    ]) {
      const page = await get(from);
      const landed = page.location ? new URL(page.location, BASE).pathname : null;
      if (![307, 308].includes(page.status) || landed !== to) problems.push(`${from} -> ${page.status} ${landed}`);
    }
    expectAll(problems, 'redirects wrong');
  });

  await check('legal pages: final Terms and Privacy Policy; chapter forms link clause 11; linked in the footer', () => {
    expect(!/Mobile Applications|App Store/.test(text('/terms')), 'mobile app clause present');
    expect(html('/terms').includes('id="chapter-partner-program"'), 'no Chapter Partner Program clause to link to');
    expect(text('/privacy').includes('legal@antisocialtalks.com'), 'no privacy contact');
    expect(text('/privacy').includes('Viswateja, Privacy Officer'), 'no Privacy Officer');
    expect(!text('/privacy').includes('will be published on this page'), 'privacy still says the policy is coming');
    expect(html('/privacy').includes('href="https://www.priv.gc.ca"'), 'regulator site not linked');
    expect(html('/chapters/start').includes('href="/terms#chapter-partner-program"'), 'chapter application does not link clause 11');
    expect(linksOf(html('/')).includes('/terms') && linksOf(html('/')).includes('/privacy'), 'footer does not link /terms and /privacy');
  });

  await check('robots.txt keeps staging out of search; sitemap lists only live pages', async () => {
    const robots = await get('/robots.txt');
    expect(/Disallow: \/\s*$/m.test(robots.body), `staging robots.txt should disallow all:\n${robots.body}`);
    const sitemap = await get('/sitemap.xml');
    const urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(urls.length > 20, `only ${urls.length} URLs in the sitemap`);
    expect(urls.every((u) => u.startsWith(SITE_URL)), 'sitemap URLs not on the site URL');
    const problems = [];
    for (const url of urls) {
      const path = url.slice(SITE_URL.length) || '/';
      const page = pages.get(path) || (await get(path));
      if (page.status !== 200) problems.push(`${path} -> ${page.status}`);
    }
    expectAll(problems, 'sitemap URLs that are not pages');
    for (const hidden of ['/events/india-upcoming-chapter-event', '/shop/retired', '/voices/hidden-guest']) {
      expect(!urls.includes(SITE_URL + hidden), `sitemap lists ${hidden}`);
    }
    expect(!urls.some((u) => u.includes('/invite/')), 'the sitemap lists a private invitation page');
  });

  await check('API on the built server: market, assets, forms, and closed doors', async () => {
    const market = await get('/api/market', { headers: { 'cf-ipcountry': 'GB' } });
    expect(JSON.parse(market.body).market === 'GB', `market: ${market.body}`);

    expect((await get(`/api/assets/${FILES.mockup}?width=200`)).status === 200, 'mockup image not served');
    expect((await get(`/api/assets/${FILES.proposal}`)).status === 404, 'private proposal PDF served');
    expect((await get(`/api/assets/${FILES.svg}`)).status === 404, 'SVG served');
    expect((await get('/api/assets/99999999-9999-4999-8999-999999999999')).status === 404, 'missing file not a 404');

    const before = cms.rows('submissions').length;
    const submitted = await get('/api/submissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'community', email: `e2e-${mode}@example.com`, interest: 'newsletter', consent_email: true }),
    });
    expect(submitted.status === 200, `newsletter: ${submitted.status} ${submitted.body}`);
    expect(cms.rows('submissions').length === before + 1, 'newsletter row not in the CMS');

    const post = (path, body = {}) => get(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    expect((await post('/api/checkout')).status === 501, 'checkout should be closed without a payment gateway');
    expect((await post('/api/cron/orders')).status === 401, 'cron should need its secret');
    const quote = await post('/api/gelato/quote', {
      shippingAddress: { firstName: 'A', lastName: 'B', addressLine1: '1 St', city: 'London', postCode: 'SW1A 2AA', country: 'GB', email: 'a@b.co' },
      items: [{ slug: 'tee-anti-bullshit', gelatoProductUid: 'tee_uid_s', quantity: 1 }],
    });
    if (open) {
      expect(quote.status === 502 && /delivery options/.test(quote.body), `quote without a Gelato key: ${quote.status} ${quote.body}`);
    } else {
      expect(quote.status === 501, `quote while Coming Soon: ${quote.status}`);
    }
  });

  if (open) {
    await check('shop open: prices, sizes and Add to Cart; cart and checkout pages', () => {
      const shop = text('/shop');
      expect(shop.includes('Not Anti-Opinion Tee') && shop.includes('India Only Tee'), 'products missing');
      expect(!shop.includes('Retired Tee'), 'a draft product is listed');
      expect(shop.includes('₹3,999'), 'no INR price before the market is known');
      // No price menu: prices follow the visitor's country, and stay hidden until it is known.
      expect(!/Shopping country|Prices for/.test(html('/shop') + html('/shop/tee-anti-bullshit') + html('/cart')), 'the price menu is back');
      expect(/<span class="[^"]*\binvisible\b[^"]*">₹3,999/.test(html('/shop/tee-anti-bullshit')), 'the price should wait for the country');
      // The specification comes from the CMS (India's rows first, as the page opens in India); no printer names.
      const productText = textOf(html('/shop/tee-anti-bullshit'));
      expect(productText.includes('Specification') && productText.includes('Qikink cotton, 240 g/m²') && productText.includes('Wash cold'), 'the specification is missing');
      expect(!/Printed by|Ships to|Garment (Print|Size)|Product Status/.test(productText), 'the old rows are back');
      expect(!/on.demand/i.test(productText + text('/shop') + text('/cart')), '"print on demand" is back on the shop pages');
      const product = textOf(html('/shop/tee-anti-bullshit'));
      // With sizes to pick, the button reads "Choose a size" until one is chosen.
      expect(/Choose a size|Add to cart/i.test(product), 'no Add to cart button');
      expect(/\bS\b/.test(product) && /\bM\b/.test(product), 'size buttons missing');
      expect(!/Coming Soon/i.test(product), 'Coming Soon shown while the shop is open');
      // The model photo leads (square) and the flat mockup follows; without a photo, the mockup leads.
      const page = html('/shop/tee-anti-bullshit');
      const photoAt = page.indexOf(FILES.photo);
      expect(photoAt > 0 && page.indexOf(FILES.mockup, photoAt) > photoAt, 'the model photo should come first, then the mockup');
      // One large square slider, the other photos as thumbnails under it.
      expect(/aria-roledescription="carousel"/.test(page) && /aria-roledescription="slide"[^>]*>\s*<div class="[^"]*aspect-square/.test(page), 'the photos should be a square slider');
      expect(page.includes('aria-label="Show photo 2"') && page.includes('aria-label="Next photo"'), 'the other photos should be thumbnails, with arrows');
      // More photos come after the main photo and mockup.
      const galleryAt = page.indexOf(FILES.galleryPhoto);
      expect(galleryAt > page.indexOf(FILES.mockup, photoAt), 'the extra photos should follow the main pictures');
      expect(html('/shop').includes(FILES.photo), 'the shop grid should show the model photo');
      expect(!html('/shop/india-only').includes(FILES.photo), 'a product without a photo shows only its mockup');
      // The page opens in the India market: Qikink makes size S only, so M is off.
      expect(/<button[^>]*disabled=""[^>]*>M<\/button>/.test(page), 'size M should be off in India (Qikink makes S only)');
      expect(!/<button[^>]*disabled=""[^>]*>S<\/button>/.test(page), 'size S should be on in India');
      expect(/noindex/.test(html('/payment/complete')), 'the payment return page should not be indexed');
      // Colours: the teal pictures come with the page, and the shop card shows every colour sold somewhere.
      expect(page.includes(FILES.tealMockup), 'the teal pictures are not on the product page');
      expect(html('/shop').includes('aria-label="Colours: Deep Black, Teal, Sand"'), 'colour swatches missing on the shop card');
      expect(pages.get('/cart')?.status === 200 && pages.get('/checkout')?.status === 200, 'cart or checkout not served');
    });
  } else {
    await check('shop "Coming Soon": no cart anywhere, cart and checkout go to the shop', () => {
      const product = textOf(html('/shop/tee-anti-bullshit'));
      expect(/Coming Soon/i.test(product), 'no Coming Soon on the product page');
      expect(!/Add to cart/i.test(product), 'Add to cart still shown');
      expect(redirectsTo('/cart', '/shop') && redirectsTo('/checkout', '/shop'), 'cart/checkout do not redirect to /shop');
      const linkingCart = [...pages].filter(([, p]) => p.status === 200 && linksOf(p.body).some((l) => l === '/cart' || l === '/checkout'));
      expect(linkingCart.length === 0, `pages still link the cart: ${linkingCart.map(([p]) => p).join(', ')}`);
    });
  }
}

/* ───────────────────────────── the run ───────────────────────────── */

const { cms, server: cmsServer } = await serveCms();
let site;
try {
  for (const mode of MODES) {
    console.log(`\n▶ shop ${mode === 'open' ? 'open' : '“Coming Soon”'}`);
    const env = siteEnv(mode);
    await build(env);
    site = await start(env);
    await runChecks(mode, cms);
    site.child.kill();
    await new Promise((r) => site.child.once('exit', r));
    const serverErrors = site.log().split('\n').filter((l) => /⨯|Error:|unhandled/i.test(l) && !/could not load product|GELATO_API_KEY|\[gelato\/quote\]/.test(l));
    await check('the server logged no unexpected errors', () => expectAll(serverErrors, 'error lines'));
    site = null;
  }
} finally {
  site?.child.kill();
  cmsServer.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
