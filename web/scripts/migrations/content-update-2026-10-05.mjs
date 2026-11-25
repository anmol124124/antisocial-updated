#!/usr/bin/env node
/**
 * Content update, 2026-10-05 — copy direction ("AntiSocialTalks Website
 * Suggestions", Part 1):
 *
 *   1. topics.blurb  — the one-line hook under each topic tile
 *   2. guests.teaser — new field: a pulled-quote hook on guest cards/pages,
 *                      plus the one teaser supplied so far (Abdu Rozik)
 *   3. episodes      — replaces the seeded working note that was showing as
 *                      the public description of Episode 01
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/migrations/content-update-2026-10-05.mjs
 *
 * Idempotent. Only touches the rows named below; a description the team has
 * already rewritten is left alone.
 */

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;

const TOPIC_HOOKS = {
  Human: 'The stories behind the people you think you know.',
  Health: 'What your doctor won’t say in twelve minutes.',
  Science: 'The questions nobody funds, asked anyway.',
  Technology: 'Built fast. Explained slow.',
  Business: 'Built in public. Broken in private.',
  Society: 'The rules nobody voted on.',
  'The Future': 'Already happening. Just not evenly.',
};

const GUEST_TEASERS = {
  'Abdu Rozik': 'On fame, fear, and the thing nobody asks him about.',
};

// The seed script's original Episode 01 description started with this — it
// was a note to the team, not copy for visitors.
const SEEDED_NOTE_PREFIX = 'Our very first conversation. It publishes on YouTube first';
const EPISODE_01_DESCRIPTION = 'The first conversation is already happening. You’ll hear it first.';

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
    const err = new Error(`${method} ${path}: ${json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
    err.status = res.status;
    throw err;
  }
  return json?.data;
}

const q = (o) => encodeURIComponent(JSON.stringify(o));

console.log(`\n  Copy update for ${BASE}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  console.log('  --- topic hooks ---');
  for (const [title, blurb] of Object.entries(TOPIC_HOOKS)) {
    const row = (await api(`/items/topics?filter=${q({ title: { _eq: title } })}&fields=id&limit=1`))?.[0];
    if (!row) {
      console.log(`  ! topic not found: ${title}`);
      continue;
    }
    await api(`/items/topics/${row.id}`, { method: 'PATCH', body: { blurb } });
    console.log(`  + ${title.padEnd(11)} ${blurb}`);
  }

  console.log('\n  --- guest teasers ---');
  try {
    await api('/fields/guests/teaser');
    console.log('  = guests.teaser exists');
  } catch (err) {
    if (err.status !== 403 && err.status !== 404) throw err;
    await api('/fields/guests', {
      method: 'POST',
      body: {
        field: 'teaser',
        type: 'string',
        meta: {
          interface: 'input',
          width: 'full',
          note: 'One-line hook shown on the guest card, e.g. "On fame, fear, and the thing nobody asks him about." No quotation marks.',
        },
        schema: {},
      },
    });
    console.log('  + guests.teaser created');
  }
  for (const [name, teaser] of Object.entries(GUEST_TEASERS)) {
    const row = (await api(`/items/guests?filter=${q({ name: { _eq: name } })}&fields=id&limit=1`))?.[0];
    if (!row) {
      console.log(`  ! guest not found: ${name}`);
      continue;
    }
    await api(`/items/guests/${row.id}`, { method: 'PATCH', body: { teaser } });
    console.log(`  + ${name}: ${teaser}`);
  }

  console.log('\n  --- episode 01 ---');
  const episodes = (await api(`/items/episodes?fields=id,title,description&limit=-1`)) || [];
  let fixed = 0;
  for (const ep of episodes) {
    if ((ep.description || '').startsWith(SEEDED_NOTE_PREFIX)) {
      await api(`/items/episodes/${ep.id}`, { method: 'PATCH', body: { description: EPISODE_01_DESCRIPTION } });
      console.log(`  + "${ep.title}": working note replaced`);
      fixed++;
    }
  }
  if (!fixed) console.log('  = no seeded working note found (already rewritten)');

  console.log('\n  Done. The site picks this up within a minute (refresh twice).\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
