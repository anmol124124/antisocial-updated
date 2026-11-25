#!/usr/bin/env node
/**
 * Content update, 2026-10-04:
 *
 *   1. schema  — guests.home_position, hosts.designation, hosts.quote
 *   2. home    — only Shresta Iyer, Abdu Rozik, Dr. Anmol Kapoor on the home
 *                page, in that order (every other guest's position is cleared)
 *   3. host    — Rishika Sharma, with her photo uploaded into Directus
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 \
 *   DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/migrations/content-update-2026-10-04.mjs scripts/assets/rishika-sharma.jpg
 *
 * Idempotent: fields are only created when missing, the photo is only
 * uploaded when the host has none, and re-running just re-applies the same
 * positions. Afterwards all of it is editable in the Directus UI.
 */

import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;
const PHOTO = process.argv[2] || '';

const HOME_GUESTS = ['Shresta Iyer', 'Abdu Rozik', 'Dr. Anmol Kapoor'];

const HOST = {
  name: 'Rishika Sharma',
  designation: 'Host & Moderator | AntiSocialTalks',
  quote: 'I’m here for the Real Tea!',
  status: 'published',
};

if (!EMAIL || !PASSWORD) {
  console.error('\n  Set DIRECTUS_EMAIL and DIRECTUS_PASSWORD (the admin login).\n');
  process.exit(1);
}

let token = '';

async function api(path, { method = 'GET', body, raw } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(raw ? {} : { 'Content-Type': 'application/json' }),
    },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || `HTTP ${res.status}`;
    const err = new Error(`${method} ${path}: ${msg}`);
    err.status = res.status;
    throw err;
  }
  return json?.data;
}

const q = (o) => encodeURIComponent(JSON.stringify(o));

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`login failed: ${json?.errors?.[0]?.message || res.status}`);
  token = json.data.access_token;
}

async function ensureField(collection, field, type, meta) {
  try {
    await api(`/fields/${collection}/${field}`);
    console.log(`  = ${collection}.${field} exists`);
  } catch (err) {
    if (err.status !== 403 && err.status !== 404) throw err;
    await api(`/fields/${collection}`, {
      method: 'POST',
      body: { field, type, meta: { interface: 'input', width: 'half', ...meta }, schema: {} },
    });
    console.log(`  + ${collection}.${field} created`);
  }
}

async function findOne(collection, filter, fields = '*') {
  const rows = await api(`/items/${collection}?filter=${q(filter)}&fields=${fields}&limit=1`);
  return rows?.[0] ?? null;
}

/* ─────────────────────────────── main ─────────────────────────────── */

console.log(`\n  Content update for ${BASE}\n`);

try {
  await login();

  console.log('  --- schema ---');
  await ensureField('guests', 'home_position', 'integer', {
    note: 'Position on the home page (1 = first). Leave empty to keep this guest off the home page.',
  });
  await ensureField('hosts', 'designation', 'string', {
    note: 'Shown under the name, e.g. "Host & Moderator | AntiSocialTalks".',
  });
  await ensureField('hosts', 'quote', 'string', {
    width: 'full',
    note: 'One-line signature quote, without quotation marks.',
  });

  console.log('\n  --- home page guests ---');
  // Clear every existing position first, so the home page shows exactly
  // these three and nobody left over from an earlier curation.
  const positioned = await api(`/items/guests?filter=${q({ home_position: { _nnull: true } })}&fields=id&limit=-1`);
  for (const g of positioned || []) {
    await api(`/items/guests/${g.id}`, { method: 'PATCH', body: { home_position: null } });
  }

  for (const [i, name] of HOME_GUESTS.entries()) {
    const guest = await findOne('guests', { name: { _eq: name } }, 'id,name,status');
    if (!guest) {
      console.log(`  ! not found: "${name}" — check the spelling in Directus`);
      continue;
    }
    await api(`/items/guests/${guest.id}`, { method: 'PATCH', body: { home_position: i + 1 } });
    console.log(`  ${i + 1}. ${name}${guest.status === 'published' ? '' : `  (status is "${guest.status}" — it will not show until Published)`}`);
  }

  console.log('\n  --- host ---');
  let host = await findOne('hosts', { name: { _eq: HOST.name } }, 'id,photo');

  let photoId = host?.photo ?? null;
  if (!photoId) {
    if (PHOTO && existsSync(PHOTO)) {
      const form = new FormData();
      form.append('title', HOST.name);
      // Directus requires `file` to be the last part of the multipart body.
      form.append('file', new Blob([readFileSync(PHOTO)], { type: 'image/jpeg' }), basename(PHOTO));
      const file = await api('/files', { method: 'POST', raw: form });
      photoId = file.id;
      console.log(`  + photo uploaded (${basename(PHOTO)})`);
    } else {
      console.log(`  ! no photo uploaded — pass its path as the first argument`);
    }
  } else {
    console.log('  = photo already set');
  }

  if (host) {
    await api(`/items/hosts/${host.id}`, { method: 'PATCH', body: { ...HOST, photo: photoId } });
    console.log(`  = ${HOST.name} updated`);
  } else {
    host = await api('/items/hosts', { method: 'POST', body: { ...HOST, photo: photoId } });
    console.log(`  + ${HOST.name} created`);
  }

  console.log('\n  Done. The site picks this up within a minute (refresh twice).\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
