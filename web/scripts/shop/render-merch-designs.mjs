#!/usr/bin/env node
/**
 * Renders the merch print files (transparent PNGs) for the slogan collection
 * from the client's mockups, using headless Chrome and Google Fonts that are
 * close to the mockup lettering:
 *   Anton            condensed capitals ("ANTISOCIAL.", "I SAID")
 *   Oswald 700       condensed lower case ("anti-opinion.")
 *   Playfair Display italic, in gold ("We decided", "over", "WHAT")
 *   Roboto Condensed 900, plain capitals ("IDEAS OVER SMALL TALK.")
 *   Inter            the AntiSocialTalks wordmark on the back
 *
 *   node scripts/shop/render-merch-designs.mjs            all files
 *   node scripts/shop/render-merch-designs.mjs hoodie     names containing "hoodie"
 *   node scripts/shop/render-merch-designs.mjs cap-,tote- names containing either
 *   node scripts/shop/render-merch-designs.mjs --dark     dark ink for light garments (grey): <name>-dark.png
 *
 * Output: merch/designs/<name>.png at 3600x4800 (12x16 in, 300 dpi), the
 * whole print area. Fronts sit at the top of the canvas (chest height on the
 * garment); hoodie fronts stay in the top half, clear of the pocket.
 *
 * These are faithful recreations. If the designer supplies master artwork,
 * drop it in merch/designs with the same names instead.
 *
 * Set CHROME to the browser path if it isn't in the default Windows place.
 */

import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { ASSETS_DIR } from '../lib/paths.mjs';

const OUT = resolve(ASSETS_DIR, 'merch', 'designs');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const W = 3600;
const H = 4800;
// --dark: the same designs in dark ink, for light garments (grey). Files get a "-dark" suffix.
const DARK = process.argv.includes('--dark');
const WHITE = DARK ? '#262626' : '#F3EFE7';
const GOLD = DARK ? '#AE8636' : '#C9A063';

/* ───────────────────────────── type ───────────────────────────── */

const anton = (text, size, color = WHITE, extra = '') =>
  `<div style="font-family:Anton,sans-serif;font-size:${size}px;line-height:.98;color:${color};letter-spacing:.005em;${extra}">${text}</div>`;
const oswald = (text, size, color = WHITE, extra = '') =>
  `<div style="font-family:Oswald,sans-serif;font-weight:700;font-size:${size}px;line-height:1;color:${color};letter-spacing:-.01em;${extra}">${text}</div>`;
const serif = (text, size, color = GOLD, extra = '') =>
  `<div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:500;font-size:${size}px;line-height:1;color:${color};${extra}">${text}</div>`;
const condensed = (text, size, color = WHITE, extra = '') =>
  `<div style="font-family:'Roboto Condensed',sans-serif;font-weight:900;font-size:${size}px;line-height:.95;color:${color};${extra}">${text}</div>`;
const caps = (text, size, color = WHITE, extra = '') =>
  `<div style="font-family:Inter,sans-serif;font-weight:700;font-size:${size}px;line-height:1.1;letter-spacing:.06em;color:${color};${extra}">${text}</div>`;
const gold = (t) => `<span style="color:${GOLD}">${t}</span>`;
const row = (...parts) => `<div style="display:flex;align-items:center;justify-content:center;gap:40px">${parts.join('')}</div>`;

/* ───────────────────────────── icons ───────────────────────────── */

const svg = (w, h, body) => `<svg width="${w}" height="${h}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

/** Outlined speech bubble with three short rays, as on "TO TALK." */
const bubbleRays = (size, color = GOLD) =>
  svg(size, size, `<path d="M14 22h48a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8H36l-14 14 2-14h-10a8 8 0 0 1-8-8V30a8 8 0 0 1 8-8z" stroke="${color}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M80 26l12-8M82 42h14M80 58l12 8" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`);

/** Speech bubble with three dots. */
const bubbleDots = (size, color = WHITE) =>
  svg(size, size, `<path d="M12 18h76a8 8 0 0 1 8 8v36a8 8 0 0 1-8 8H40l-18 16 3-16H12a8 8 0 0 1-8-8V26a8 8 0 0 1 8-8z" stroke="${color}" stroke-width="6" stroke-linejoin="round"/>
    <circle cx="32" cy="44" r="5" fill="${color}"/><circle cx="50" cy="44" r="5" fill="${color}"/><circle cx="68" cy="44" r="5" fill="${color}"/>`);

/** Small solid speech bubble. */
const bubbleSolid = (size, color = GOLD) =>
  svg(size, size, `<path d="M18 16h64a12 12 0 0 1 12 12v30a12 12 0 0 1-12 12H44l-22 18 4-18h-8A12 12 0 0 1 6 58V28a12 12 0 0 1 12-12z" fill="${color}"/>`);

/** Light bulb with rays. */
const bulb = (size, color = GOLD) =>
  svg(size, size, `<path d="M50 30a20 20 0 0 0-12 36c3 3 4 6 4 10h16c0-4 1-7 4-10a20 20 0 0 0-12-36z" stroke="${color}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M42 84h16M44 92h12M50 6v10M22 16l7 8M78 16l-7 8M12 40h10M78 40h10" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`);

/** Short spark lines. */
const rays = (size, color = GOLD) =>
  svg(size, size, `<path d="M20 70L60 40M30 88L80 70M14 46L34 14" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`);

/** Hand-drawn underline. */
const swoosh = (width, color = GOLD, height = 70) =>
  `<svg width="${width}" height="${height}" viewBox="0 0 400 20" preserveAspectRatio="none" fill="none"><path d="M6 14C120 4 260 2 394 8" stroke="${color}" stroke-width="7" stroke-linecap="round"/></svg>`;

/* ───────────────────────────── layout ───────────────────────────── */

/**
 * Front: centred block at chest height. `zoom` scales a taller design down so
 * hoodie fronts stay within about 7 in, clear of the pocket.
 */
const front = (inner, { top = 260, zoom = 1 } = {}) => ({
  w: W,
  h: H,
  body: `<div style="position:absolute;left:0;right:0;top:${top}px;zoom:${zoom};display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px">${inner}</div>`,
});

/**
 * Capitals in Roboto Condensed, scaled so the widest line is `width` px
 * (the page script below sets the zoom once the font has loaded).
 */
const lines = (rows, width, color = WHITE) =>
  `<div data-fit="${width}" style="display:inline-flex;flex-direction:column;align-items:center">${rows.map((r) => condensed(r, 400, color)).join('')}</div>`;

/** The AntiSocialTalks wordmark, `width` px wide. */
const wordmark = (width, color = WHITE) =>
  `<div data-fit="${width}" style="display:inline-flex;align-items:flex-end;font-family:Inter,sans-serif;font-size:300px;line-height:1;letter-spacing:-.035em;color:${color}"><b style="font-weight:800">AntiSocial</b><span style="font-weight:400">Talks</span></div>`;

/** A slogan on an apparel front, at chest height. */
const slogan = (rows, width, top = 300) => front(lines(rows, width), { top });

/** Cap embroidery: the front panel (4.5 x 2 in) and the back above the strap (3 x 1 in). */
const capFront = (text) => ({
  w: 1350,
  h: 600,
  body: `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${lines([text], 1150)}</div>`,
});
const CAP_BACK = {
  w: 900,
  h: 300,
  body: `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${wordmark(800)}</div>`,
};

/** Tote, one side (12 x 14 in): the slogan in the middle, the wordmark small at the bottom. */
const tote = (rows) => ({
  w: 3600,
  h: 4200,
  body:
    `<div style="position:absolute;left:0;right:0;top:1150px;display:flex;justify-content:center">${lines(rows, 3000)}</div>` +
    `<div style="position:absolute;left:0;right:0;top:3650px;display:flex;justify-content:center">${wordmark(820)}</div>`,
});

/** Back: the wordmark across the upper back. */
const BACK = {
  w: W,
  h: H,
  body: `<div style="position:absolute;left:0;right:0;top:560px;display:flex;justify-content:center;align-items:flex-end;font-family:Inter,sans-serif;font-size:330px;line-height:1;letter-spacing:-.035em;color:${WHITE}">
    <b style="font-weight:800">AntiSocial</b><span style="font-weight:400">Talks</span></div>`,
};

const DESIGNS = {
  /* ───── hoodies ───── */
  'hoodie-we-decided-to-talk-front': front(
    caps('THEY CALLED US', 200) +
      anton('ANTISOCIAL.', 620, WHITE, 'margin-top:20px') +
      serif('We decided', 520, GOLD, 'margin-top:10px') +
      row(anton('TO TALK.', 600), bubbleRays(460)),
  ),
  'hoodie-humanity-over-herd-front': front(
    anton('HUMANITY', 600) +
      serif('over', 480) +
      anton('HERD', 600) +
      anton('MENTALITY.', 600) +
      `<div style="display:flex;gap:46px;align-items:flex-end;margin-top:80px">${[0, 1, 2]
        .map(() => `<span style="width:120px;height:120px;border-radius:50%;border:14px solid ${WHITE}"></span>`)
        .join('')}<span style="width:120px;height:120px;border-radius:50%;border:14px solid ${GOLD};margin-bottom:110px"></span></div>`,
    { zoom: 0.8 },
  ),
  'hoodie-i-disagree-front': front(
    row(anton('I', 560), `<span style="width:320px"></span>`, bubbleDots(380)) +
      anton('DISAGREE.', 680) +
      row(bubbleDots(290, GOLD), serif('LET’S TALK.', 480)),
  ),
  'hoodie-anti-silence-front': front(
    row(anton('NOT', 560), bubbleDots(360, GOLD)) +
      anton('ANTI-PEOPLE.', 560) +
      serif('ANTI-', 540) +
      row(anton('SILENCE.', 640), rays(300)) +
      swoosh(2200),
    { zoom: 0.88 },
  ),
  'hoodie-fit-in-front': front(
    anton('I DIDN’T', 560) +
      anton('COME HERE', 560) +
      row(
        serif('TO', 440),
        `<div style="border:12px solid ${GOLD};padding:30px 50px 20px">${anton('FIT IN.', 560)}</div>`,
      ),
  ),

  /* ───── tees ───── */
  'tee-anti-bullshit-front': front(
    serif('Not', 600, GOLD, 'font-weight:600;margin-right:900px') +
      oswald('anti-opinion.', 600) +
      oswald(`Anti-bulls${gold('*')}it.`, 600) +
      swoosh(2400),
  ),
  'tee-opinions-raw-front': front(
    oswald('Opinions', 640) +
      serif('raw,', 640) +
      swoosh(900) +
      oswald('no filter,', 640) +
      oswald(`no flaw${gold('.')}<span style="color:${GOLD};font-size:.55em;position:relative;top:-.55em;margin-left:.04em">*</span>`, 640),
  ),
  'tee-dont-die-with-your-ideas-front': front(
    anton('DON’T DIE', 660) +
      caps('WITH YOUR', 300, WHITE, 'font-family:Oswald;font-weight:700;letter-spacing:.02em') +
      row(serif('IDEAS.', 760, GOLD, 'font-weight:700'), bulb(420)) +
      swoosh(2000),
  ),
  'tee-i-said-what-i-said-front': front(
    anton('I SAID', 700) + serif('WHAT', 700) + anton('I SAID', 700) + row(swoosh(1000), bubbleSolid(240)),
  ),
  'tee-proudly-out-of-line-front': front(
    anton('PROUDLY', 680) +
      serif('OUT OF', 640) +
      anton(`LINE${gold('.')}`, 680) +
      `<svg width="2000" height="140" viewBox="0 0 200 14" fill="none" preserveAspectRatio="none"><path d="M2 12H100V4H198" stroke="${GOLD}" stroke-width="2.2"/></svg>`,
  ),

  'tee-ideas-over-small-talk-front': front(
    `<div style="display:flex;flex-direction:column;align-items:center">${condensed('IDEAS', 470)}${condensed('OVER', 470)}${condensed('SMALL TALK.', 470)}</div>`,
  ),

  /* ───── city drop: hoodies (front only) ───── */
  'hoodie-challenge-the-norm-front': slogan(['CHALLENGE', 'THE NORM'], 2400),
  'hoodie-think-bigger-front': slogan(['THINK', 'BIGGER.'], 2100),
  'hoodie-real-people-real-talk-front': slogan(['REAL', 'PEOPLE.', 'REAL TALK.'], 2050),
  'hoodie-question-everything-front': slogan(['QUESTION', 'EVERYTHING.'], 2400),
  'hoodie-ideas-over-small-talk-front': slogan(['IDEAS OVER', 'SMALL TALK.'], 2500),

  /* ───── city drop: tees (front; the wordmark on the back) ───── */
  'tee-think-bigger-front': slogan(['THINK', 'BIGGER.'], 2200),
  'tee-better-questions-front': slogan(['BETTER', 'QUESTIONS'], 2500),
  'tee-different-perspectives-front': slogan(['DIFFERENT', 'PERSPECTIVES.', 'BETTER', 'SOLUTIONS.'], 2550),
  'tee-real-people-real-talk-front': slogan(['REAL', 'PEOPLE', 'REAL TALK.'], 2300),
  'tee-challenge-the-norm-front': slogan(['CHALLENGE', 'THE NORM.'], 2550),

  /* ───── caps (embroidery) ───── */
  'cap-thinking-front': capFront('THINKING.'),
  'cap-unfiltered-front': capFront('UNFILTERED.'),
  'cap-disrupt-front': capFront('DISRUPT.'),
  'cap-wordmark-back': CAP_BACK,

  /* ───── tote bags ───── */
  'tote-not-anti-society': tote(['NOT ANTI-SOCIETY.', 'ANTI-SILENCE.']),
  'tote-skip-the-small-talk': tote(['SKIP THE', 'SMALL TALK.']),

  /* ───── one back for every product ───── */
  'wordmark-back': BACK,
};

const page = ({ w, h, body }) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@700&family=Playfair+Display:ital,wght@1,500;1,600;1,700&family=Inter:wght@400;700;800&family=Roboto+Condensed:wght@900&display=block" rel="stylesheet">
<style>
  html,body{margin:0;width:${w}px;height:${h}px;background:transparent;overflow:hidden}
  body{position:relative}
  sup{vertical-align:top;position:relative;top:-.1em}
</style></head><body>${body}
<script>
  // Blocks marked data-fit are scaled to that width once the fonts are in.
  document.fonts.ready.then(() => {
    for (const el of document.querySelectorAll('[data-fit]')) el.style.zoom = Number(el.dataset.fit) / el.getBoundingClientRect().width;
  });
</script></body></html>`;

// Names to render: parts of names, comma-separated (all when left out).
const only = process.argv.slice(2).find((a) => !a.startsWith('--'))?.split(',');
mkdirSync(OUT, { recursive: true });
const work = resolve(tmpdir(), `ast-merch-${process.pid}`);
mkdirSync(work, { recursive: true });

let failed = 0;
for (const [name, design] of Object.entries(DESIGNS)) {
  if (only && !only.some((part) => name.includes(part))) continue;
  const html = resolve(work, `${name}.html`);
  writeFileSync(html, page(design));
  const png = resolve(OUT, `${name}${DARK ? '-dark' : ''}.png`);
  const run = spawnSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      `--window-size=${design.w},${design.h}`,
      '--virtual-time-budget=12000',
      `--screenshot=${png}`,
      pathToFileURL(html).href,
    ],
    { encoding: 'utf8' },
  );
  if (run.status !== 0) {
    failed++;
    console.log(`  x ${name}: ${run.error?.message || run.stderr?.slice(0, 200)}`);
  } else {
    console.log(`  + merch/designs/${name}${DARK ? '-dark' : ''}.png`);
  }
}
rmSync(work, { recursive: true, force: true });
if (failed) process.exitCode = 1;
