#!/usr/bin/env node
/**
 * London has happened (3 Nov 2026): it is marked Completed and its words move
 * to the past tense (10 Nov 2026).
 *
 *   status        Completed (the site already treats it so from its date; this
 *                 makes the CMS say the same)
 *   description   "AntiSocialTalks London was an afternoon ..."; the "Expect ..."
 *                 line goes
 *   highlights    the format and the goodies, no longer in the future
 *   people        the host's, the guest host's and BioAro's lines, past tense
 *
 * Only these sentences change. A sentence the team has rewritten in the CMS
 * since is left alone and listed, to check by hand. The invitation link keeps
 * working and now says the invitation has closed. The site shows all of this
 * within a minute.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/london-completed-2026-11-10.mjs [--dry-run]
 *
 * --dry-run  shows what would change and changes nothing.
 *
 * Safe to re-run.
 */

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;
const DRY = process.argv.includes('--dry-run');
const LONDON = 'london-2026';

// [as written before the event, after it]
const PAST_TENSE = [
  ['AntiSocialTalks London is an afternoon', 'AntiSocialTalks London was an afternoon'],
  [' Expect a view of the future you have never heard before.', ''],
  [
    'Forget slides and polite nodding. This is an afternoon built around real conversation, ideas that push back, and people who say what they actually think.',
    'No slides and no polite nodding: an afternoon built around real conversation, ideas that pushed back, and people who said what they actually think.',
  ],
  [
    'We have prepared some amazing goodies for everyone attending, including BioAro products shared with every guest on the day.',
    'Goodies for everyone attending, including BioAro products shared with every guest on the day.',
  ],
  ['Hosts the afternoon and keeps the conversation honest.', 'Hosted the afternoon and kept the conversation honest.'],
  ['Joins Jessica as guest host for the afternoon.', 'Joined Jessica as guest host for the afternoon.'],
  [
    'Co-organising London and sharing BioAro products with every guest on the day.',
    'Co-organised London and shared BioAro products with every guest on the day.',
  ],
];

// Words that usually mean a line still looks ahead.
const FUTURE = /\b(will|expect|join us|RSVP|is an afternoon|we have prepared|hosts the|joins)\b/i;

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
  if (!res.ok) throw new Error(`${method} ${path.split('?')[0]}: ${json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
  return json?.data;
}
const q = (o) => encodeURIComponent(JSON.stringify(o));

/** Every replacement made, and every one already in place, by its "before" text. */
const done = new Set();
const already = new Set();
function pastTense(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  for (const [before, after] of PAST_TENSE) {
    if (out.includes(before)) {
      out = out.split(before).join(after);
      done.add(before);
    } else if (!after || out.includes(after)) {
      // A line taken out can't be told from one the team removed: either way it is gone.
      already.add(before);
    }
  }
  return out;
}

console.log(`\n  London completed for ${BASE}${DRY ? ' (dry run: nothing is changed)' : ''}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  const [london] =
    (await api(`/items/events?filter=${q({ slug: { _eq: LONDON } })}&fields=id,title,status,description,highlights,people&limit=1`)) || [];
  if (!london) throw new Error(`no event with the slug ${LONDON}`);

  const description = pastTense(london.description);
  const highlights = Array.isArray(london.highlights) ? london.highlights.map((h) => ({ ...h, title: pastTense(h?.title), text: pastTense(h?.text) })) : london.highlights;
  const people = Array.isArray(london.people) ? london.people.map((p) => ({ ...p, bio: pastTense(p?.bio) })) : london.people;

  const patch = { status: 'completed' };
  if (description !== london.description) patch.description = description;
  if (JSON.stringify(highlights) !== JSON.stringify(london.highlights)) patch.highlights = highlights;
  if (JSON.stringify(people) !== JSON.stringify(london.people)) patch.people = people;

  console.log(`  ${london.title}: status ${london.status} -> completed`);
  for (const [before, after] of PAST_TENSE) {
    const what = after ? `"${after}"` : `removed "${before.trim()}"`;
    if (done.has(before)) console.log(`    ~ ${what}`);
    else if (already.has(before)) console.log(after ? `    = already: "${after}"` : `    = already gone: "${before.trim()}"`);
    else console.log(`    ? not found, left alone (edited in the CMS?): "${before.trim()}"`);
  }

  // Anything that still reads as if the event is to come, for a person to look at.
  const lines = [
    ...(description || '').split(/\n+/),
    ...(Array.isArray(highlights) ? highlights.flatMap((h) => [h?.title, h?.text]) : []),
    ...(Array.isArray(people) ? people.map((p) => p?.bio) : []),
  ].filter((l) => typeof l === 'string' && FUTURE.test(l));
  for (const line of lines) console.log(`    ! check by hand, still looks ahead: "${line}"`);

  if (DRY) {
    console.log(`\n  Dry run: would change ${Object.keys(patch).join(', ')}. Run again without --dry-run to apply.\n`);
  } else {
    await api(`/items/events/${london.id}`, { method: 'PATCH', body: patch });
    console.log(`\n  Done (${Object.keys(patch).join(', ')}). /events and /events/${LONDON} show this within a minute.\n`);
  }
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
