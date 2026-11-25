#!/usr/bin/env node
/**
 * Event posters: every events/posters/<event slug>.jpg (or .png) becomes that
 * event's image in the CMS. The event page shows it whole beside the title,
 * the event card on /events shows it whole on a blurred copy of itself, and a
 * shared link previews it.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/events/event-posters.mjs
 *
 * Safe to re-run: an unchanged poster is not uploaded again. A poster whose
 * event isn't in the CMS is reported and skipped.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { ASSETS_DIR } from '../lib/paths.mjs';

const FOLDER = resolve(ASSETS_DIR, 'events', 'posters');
const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('\n  Set DIRECTUS_EMAIL and DIRECTUS_PASSWORD (the admin login).\n');
  process.exit(1);
}

let token = '';
async function api(path, { method = 'GET', body, raw } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(raw ? {} : { 'Content-Type': 'application/json' }), Authorization: `Bearer ${token}` },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path.split('?')[0]}: ${json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
  return json?.data;
}
const q = (o) => encodeURIComponent(JSON.stringify(o));
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

/** Upload once: the title carries a fingerprint of the contents. */
async function upload(path, label) {
  const bytes = readFileSync(path);
  const title = `${label} [${createHash('sha1').update(bytes).digest('hex').slice(0, 10)}]`;
  const existing = (await api(`/files?filter=${q({ title: { _eq: title } })}&fields=id&limit=1`))?.[0];
  if (existing) return { id: existing.id, reused: true };
  const form = new FormData();
  form.append('title', title);
  form.append('file', new Blob([bytes], { type: TYPES[extname(path).toLowerCase()] }), basename(path));
  return { id: (await api('/files', { method: 'POST', raw: form })).id, reused: false };
}

console.log(`\n  Event posters for ${BASE}\n`);
try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  const posters = readdirSync(FOLDER).filter((f) => TYPES[extname(f).toLowerCase()]);
  if (!posters.length) throw new Error(`no posters in ${FOLDER}`);
  let missing = 0;
  for (const file of posters) {
    const slug = basename(file, extname(file));
    const [event] = (await api(`/items/events?filter=${q({ slug: { _eq: slug } })}&fields=id,title,image&limit=1`)) || [];
    if (!event) {
      missing++;
      console.log(`  x ${file}: no event with the slug "${slug}"`);
      continue;
    }
    const up = await upload(resolve(FOLDER, file), `Event poster: ${slug}`);
    if (event.image === up.id) {
      console.log(`  = ${event.title}: poster already set`);
      continue;
    }
    await api(`/items/events/${event.id}`, { method: 'PATCH', body: { image: up.id } });
    console.log(`  ~ ${event.title}: poster set${up.reused ? ' (file already uploaded)' : ''}`);
  }
  console.log(`\n  Done. Posters show within a minute.${missing ? ' Rename any skipped file to its event\'s slug.' : ''}\n`);
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
