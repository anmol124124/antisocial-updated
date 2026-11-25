#!/usr/bin/env node
/**
 * Content update, 2026-10-11: removes em dashes from content this project
 * seeded (titles and working copy), then lists any other dashes still in the
 * CMS so the team can decide on them — client-written copy is reported, never
 * rewritten here.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/migrations/content-update-2026-10-11.mjs
 *
 * Slugs do not change: episodes derive theirs from the title with punctuation
 * stripped, and events store theirs explicitly.
 */

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;

/** [collection, field, old value, new value] — exact matches only. */
const FIXES = [
  ['episodes', 'title', 'Episode 01 — The AntiSocial Question', 'Episode 01: The AntiSocial Question'],
  ['episodes', 'description', 'The first conversation is already happening. You’ll hear it first.', 'Episode 01 is on its way. Subscribe on YouTube to hear it the day it comes out.'],
  ['events', 'title', 'India — Upcoming Chapter Event', 'India: Upcoming Chapter Event'],
  ['events', 'title', 'Dubai — Upcoming Chapter Event', 'Dubai: Upcoming Chapter Event'],
];

/** Where to look for any remaining dashes. */
const SCAN = {
  guests: ['name', 'designation', 'teaser', 'bio'],
  hosts: ['name', 'designation', 'quote', 'bio'],
  topics: ['title', 'blurb'],
  episodes: ['title', 'description'],
  events: ['title', 'blurb', 'theme', 'description', 'audience'],
  chapters: ['city', 'theme'],
  shop_products: ['title', 'description'],
};

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

console.log(`\n  Dash cleanup for ${BASE}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  console.log('  --- fixes ---');
  for (const [collection, field, from, to] of FIXES) {
    const rows = (await api(`/items/${collection}?filter=${q({ [field]: { _eq: from } })}&fields=id&limit=-1`)) || [];
    if (!rows.length) {
      console.log(`  = ${collection}.${field}: "${from.slice(0, 40)}" not present (already changed?)`);
      continue;
    }
    for (const r of rows) await api(`/items/${collection}/${r.id}`, { method: 'PATCH', body: { [field]: to } });
    console.log(`  + ${collection}.${field}: "${to}"`);
  }

  console.log('\n  --- remaining dashes in the CMS (not changed) ---');
  let found = 0;
  for (const [collection, fields] of Object.entries(SCAN)) {
    let rows;
    try {
      rows = (await api(`/items/${collection}?fields=id,${fields.join(',')}&limit=-1`)) || [];
    } catch (err) {
      // A field this CMS doesn't have yet — skip the collection rather than fail.
      if (err.status === 400 || err.status === 403) continue;
      throw err;
    }
    for (const row of rows) {
      for (const f of fields) {
        const v = row[f];
        if (typeof v === 'string' && v.includes('—')) {
          found++;
          const i = v.indexOf('—');
          console.log(`  · ${collection}#${row.id}.${f}: "…${v.slice(Math.max(0, i - 40), i + 40)}…"`);
        }
      }
    }
  }
  console.log(found ? `\n  ${found} left — client copy, to be decided with the copy review.\n` : '  none\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
