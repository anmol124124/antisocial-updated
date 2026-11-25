#!/usr/bin/env node
/**
 * The released episodes, as the team listed them on 18 Nov 2026 (work list
 * tasks 1 and 2).
 *
 *   episodes.spotify_url   new: the episode on Spotify, for "Listen on Spotify"
 *   episodes.status        new option "Archived": kept in the CMS, hidden on the site
 *   episodes               the three released episodes: title, YouTube, Spotify,
 *                          release date, Published. Their description, topics
 *                          and host are left as they are.
 *   "Episode 01: The AntiSocial Question"   Archived (the team asked to take it down)
 *   guests                 each linked to their episode; "Reem Elkott" becomes
 *                          "Reem Elkot", as on YouTube. A guest still linked to
 *                          the archived episode is unlinked.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/migrations/episodes-2026-11-18.mjs [--dry-run]
 *
 * --dry-run  shows what would change and changes nothing.
 *
 * Safe to re-run.
 */

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;
const DRY = process.argv.includes('--dry-run');
const WEBSITE_POLICY = 'Website (read content, create submissions)';

// Release date: the first day of the week each episode was listed for. Noon UTC, so
// the date reads the same in every timezone. Links without share-tracking (?si=) or a start time (&t=).
const EPISODES = [
  {
    title: 'Real Talk: Reality TV Stars, Health & Life in Iran | AntiSocialTalks',
    youtube_url: 'https://youtu.be/qoRg_iHB9uc',
    spotify_url: 'https://open.spotify.com/episode/6tTMg7pRzuMOuXdMVegiCC',
    publish_date: '2026-10-28T12:00:00.000Z',
    guests: ['Mahsad Ziaee', 'Mahbod Mahmoudi Aznaveh'],
  },
  {
    title: 'From Humble Beginnings to Global Fame | Dubai, Success & Charity | AntiSocialTalks Ep. 2',
    youtube_url: 'https://www.youtube.com/watch?v=R-GzTCz8Q7Y',
    spotify_url: 'https://open.spotify.com/episode/5fhEz7hlAAJL1Z0NyplM7l',
    publish_date: '2026-11-04T12:00:00.000Z',
    guests: ['Abdu Rozik'],
  },
  {
    title: "Dubai's Wealth, AI vs Humans & Egyptian Identity | AntiSocialTalks Ep. 3",
    youtube_url: 'https://youtu.be/sFvX5La_rbs',
    spotify_url: 'https://open.spotify.com/episode/0150mDNNIV6Gnic2CFFcEV',
    publish_date: '2026-11-11T12:00:00.000Z',
    guests: ['Reem Elkot', 'Alaa Sediik'],
  },
];

const RETIRED = /the antisocial question/i;
const [MISSPELT, SPELT] = ['Elkott', 'Elkot'];
const GUEST_TEXT = ['name', 'bio', 'designation', 'teaser', 'quote', 'paired_with_label'];

const SPOTIFY_FIELD = {
  field: 'spotify_url',
  type: 'string',
  meta: { interface: 'input', width: 'full', note: 'The episode on Spotify (open.spotify.com/episode/...). Shown as "Listen on Spotify" once the episode is Published.' },
};
const STATUSES = [
  ['Coming Soon', 'coming_soon'],
  ['Published', 'published'],
  ['Archived (hidden from the site)', 'archived'],
];

if (!EMAIL || !PASSWORD) {
  console.error('\n  Set DIRECTUS_EMAIL and DIRECTUS_PASSWORD (the admin login).\n');
  process.exit(1);
}

let token = '';
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${method} ${path.split('?')[0]}: ${json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
    err.status = res.status;
    throw err;
  }
  return json?.data;
}
const q = (o) => encodeURIComponent(JSON.stringify(o));
const write = (path, body, method = 'PATCH') => (DRY ? Promise.resolve({ id: '(new)' }) : api(path, { method, body }));
const same = (a, b) => String(a || '').trim().toLowerCase().replace(/\s+/g, ' ') === String(b || '').trim().toLowerCase().replace(/\s+/g, ' ');
const videoId = (url) => /(?:youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{6,})/.exec(url || '')?.[1] || null;

console.log(`\n  Episodes for ${BASE}${DRY ? ' (dry run: nothing is changed)' : ''}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  // The Spotify field, the Archived option, and the website's right to read the field.
  try {
    await api('/fields/episodes/spotify_url');
    console.log('  = episodes.spotify_url');
  } catch (err) {
    if (err.status !== 403 && err.status !== 404) throw err;
    if (DRY) console.log('  + episodes.spotify_url (would add)');
    else {
      await api('/fields/episodes', { method: 'POST', body: SPOTIFY_FIELD });
      console.log('  + episodes.spotify_url');
    }
  }
  await write('/fields/episodes/status', { meta: { options: { choices: STATUSES.map(([text, value]) => ({ text, value })) } } });
  console.log('  ~ episodes.status: Coming Soon, Published, Archived');

  const policy = (await api(`/policies?filter=${q({ name: { _eq: WEBSITE_POLICY } })}&fields=id&limit=1`))?.[0];
  if (!policy) throw new Error('website policy not found: run ../cms/scripts/create-site-token.mjs first.');
  const [read] =
    (await api(`/permissions?filter=${q({ _and: [{ policy: { _eq: policy.id } }, { collection: { _eq: 'episodes' } }, { action: { _eq: 'read' } }] })}&fields=id,fields&limit=1`)) || [];
  if (!read) throw new Error('the website cannot read episodes: run ../cms/scripts/create-site-token.mjs first.');
  const allowed = Array.isArray(read.fields) ? read.fields : String(read.fields || '').split(',').filter(Boolean);
  if (allowed.includes('*') || allowed.includes('spotify_url')) console.log('  = website may read episodes.spotify_url');
  else {
    await write(`/permissions/${read.id}`, { fields: [...allowed, 'spotify_url'] });
    console.log('  + website may read episodes.spotify_url');
  }

  // The three released episodes: found by their YouTube video, else by title.
  const rows = (await api('/items/episodes?fields=id,title,youtube_url,status&limit=-1')) || [];
  const ids = new Map();
  console.log('');
  for (const ep of EPISODES) {
    const { guests, ...data } = ep;
    const row = rows.find((r) => videoId(r.youtube_url) === videoId(ep.youtube_url)) || rows.find((r) => same(r.title, ep.title));
    const body = { ...data, status: 'published' };
    if (row) {
      await write(`/items/episodes/${row.id}`, body);
      ids.set(ep, row.id);
      console.log(`  ~ ${ep.title} (#${row.id}): published ${ep.publish_date.slice(0, 10)}, YouTube + Spotify`);
    } else {
      const created = await write('/items/episodes', body, 'POST');
      ids.set(ep, created?.id);
      console.log(`  + ${ep.title}: published ${ep.publish_date.slice(0, 10)}, YouTube + Spotify`);
    }
  }

  const ours = new Set([...ids.values()]);
  const retired = rows.filter((r) => !ours.has(r.id) && RETIRED.test(r.title || ''));
  for (const r of retired) {
    if (r.status === 'archived') console.log(`  = ${r.title} (#${r.id}): already archived`);
    else {
      await write(`/items/episodes/${r.id}`, { status: 'archived' });
      console.log(`  - ${r.title} (#${r.id}): archived, no longer on the site`);
    }
  }
  const others = rows.filter((r) => !ours.has(r.id) && !retired.includes(r));
  for (const r of others) console.log(`  · left as it is: ${r.title} (#${r.id}, ${r.status})`);

  // Guests: the spelling fix, then each linked to their episode.
  const guests = (await api('/items/guests?fields=*&limit=-1')) || [];
  const retiredIds = new Set(retired.map((r) => r.id));
  console.log('');
  for (const g of guests) {
    const patch = {};
    for (const f of GUEST_TEXT) if (typeof g[f] === 'string' && g[f].includes(MISSPELT)) patch[f] = g[f].replaceAll(MISSPELT, SPELT);
    const name = patch.name || g.name;
    const ep = EPISODES.find((e) => e.guests.some((n) => same(n, name)));
    const current = g.episode && typeof g.episode === 'object' ? g.episode.id : g.episode;
    if (ep && current !== ids.get(ep)) patch.episode = ids.get(ep);
    if (!ep && retiredIds.has(current)) patch.episode = null;
    if (!Object.keys(patch).length) continue;
    await write(`/items/guests/${g.id}`, patch);
    const what = [
      patch.name ? `renamed to "${patch.name}"` : Object.keys(patch).some((k) => GUEST_TEXT.includes(k)) ? 'spelling fixed' : null,
      'episode' in patch ? (patch.episode ? `linked to "${ep.title.split(' | ')[0]}"` : 'unlinked from the archived episode') : null,
    ].filter(Boolean);
    console.log(`  ~ ${g.name}: ${what.join(', ')}`);
  }
  for (const ep of EPISODES) {
    for (const n of ep.guests) {
      if (!guests.some((g) => same(String(g.name || '').replaceAll(MISSPELT, SPELT), n))) {
        console.log(`  ! no guest called "${n}" in the CMS: add them under Guests and link "${ep.title.split(' | ')[0]}"`);
      }
    }
  }

  console.log(DRY ? '\n  Dry run: nothing was changed. Run again without --dry-run to apply.\n' : '\n  Done. The site shows this within a minute.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
