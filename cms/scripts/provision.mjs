#!/usr/bin/env node
/**
 * Brings any Directus — a fresh one or the live one — up to what the website needs.
 * The single replacement for cms/provision-schema.js, web/scripts/seed-directus.mjs
 * and the dated scripts in web/scripts/migrations/.
 *
 *   1. Schema       cms/schema/snapshot.json: every collection, field and relation.
 *                   Only additions and changes are applied. Anything in the CMS that is
 *                   NOT in the snapshot is left alone and listed, unless --allow-deletes.
 *   2. Permissions  cms/schema/website-policy.json: what the website's own Directus
 *                   policy may do. Missing rules are added and differing ones updated;
 *                   extra rules are listed, never removed.
 *   3. Content      cms/seed/content.json: starting content for the site-wide settings,
 *                   home page, About values, community forms, Roadshow and Chapters guide.
 *                   A list collection is only filled while it is still EMPTY; in a settings
 *                   record only the fields that are still empty are filled. Edits made in
 *                   the CMS are never overwritten.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=<admin> DIRECTUS_PASSWORD=<password> \
 *   node cms/scripts/provision.mjs [--dry-run] [--allow-deletes] [--force] [--skip-content]
 *
 *   --dry-run        show what would change, change nothing
 *   --allow-deletes  also remove collections/fields that are not in the snapshot (destroys their data)
 *   --allow-alter    also change existing database columns (type, length, nullability, relation
 *                    delete rules); otherwise those are listed and left alone, since they can lose data
 *   --force          apply the schema even though this Directus is a different version from the snapshot's
 *   --skip-content   steps 1 and 2 only
 *
 * Safe to re-run. Then: node cms/scripts/create-site-token.mjs (the website's login token).
 */

import { readFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CMS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const ALLOW_DELETES = args.has('--allow-deletes');
const ALLOW_ALTER = args.has('--allow-alter');
const FORCE = args.has('--force');

const unknown = [...args].filter((a) => !['--dry-run', '--allow-deletes', '--allow-alter', '--force', '--skip-content'].includes(a));
if (unknown.length || !EMAIL || !PASSWORD) {
  console.error(
    `${unknown.length ? `Unknown option: ${unknown.join(' ')}\n` : ''}` +
      'Usage: DIRECTUS_URL=… DIRECTUS_EMAIL=… DIRECTUS_PASSWORD=… node cms/scripts/provision.mjs [--dry-run] [--allow-deletes] [--allow-alter] [--force] [--skip-content]',
  );
  process.exit(1);
}

const readJson = (rel) => JSON.parse(readFileSync(resolve(CMS_DIR, rel), 'utf8'));
const q = (o) => encodeURIComponent(JSON.stringify(o));
let token = '';

async function api(path, { method = 'GET', body, form } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(form ? {} : { 'Content-Type': 'application/json' }) },
    body: form || (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw Object.assign(new Error(`${method} ${path.split('?')[0]} → ${res.status} ${json?.errors?.[0]?.message || text.slice(0, 200)}`), { status: res.status });
  return json?.data ?? null;
}

async function login() {
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Sign-in to ${BASE} failed (${res.status}): ${json?.errors?.[0]?.message || 'check DIRECTUS_EMAIL / DIRECTUS_PASSWORD'}`);
  token = json.data.access_token;
}

/* ─────────────────────────────── 1. schema ─────────────────────────────── */

const isDelete = (entry) => entry.diff?.[0]?.kind === 'D' && !entry.diff[0].path;
// Directus adds the primary key's display settings itself when it creates a collection;
// a snapshot taken where they were never set lists them as "to delete". Not a real difference.
/** A change to an existing column or foreign key in the database (not just its settings in the dashboard). */
const altersColumn = (entry) => entry.diff?.some((d) => d.kind !== 'N' || d.path) && entry.diff.some((d) => d.path?.[0] === 'schema');
const isPrimaryKeyNoise = (kind, entry) => kind === 'fields' && entry.field === 'id' && isDelete(entry);
const label = (e) => [e.collection, e.field, e.related_collection && `→ ${e.related_collection}`].filter(Boolean).join('.');

async function schema() {
  console.log('\n  --- 1. schema (cms/schema/snapshot.json) ---\n');
  const snapshot = readJson('schema/snapshot.json');
  const info = await api('/server/info').catch(() => null);
  const running = info?.version;
  if (running && running !== snapshot.directus) {
    const msg = `This Directus is ${running}; the snapshot was taken on ${snapshot.directus}.`;
    if (!FORCE) throw new Error(`${msg} Upgrade/downgrade the container (cms/docker-compose.yml pins it) or re-run with --force.`);
    console.log(`  ! ${msg} Continuing (--force).`);
  }

  const diff = await api(`/schema/diff${FORCE ? '?force=true' : ''}`, { method: 'POST', body: snapshot });
  if (!diff) return console.log('  = already up to date');

  const kept = { collections: [], fields: [], relations: [] };
  const skipped = [];
  for (const kind of Object.keys(kept)) {
    for (const entry of diff.diff[kind] || []) {
      if (isPrimaryKeyNoise(kind, entry)) continue;
      if (isDelete(entry) && !ALLOW_DELETES) skipped.push(`${kind.slice(0, -1)} ${label(entry)}`);
      else if (!isDelete(entry) && altersColumn(entry) && !ALLOW_ALTER) skipped.push(`${kind.slice(0, -1)} ${label(entry)} (database column change)`);
      else kept[kind].push(entry);
    }
  }
  for (const kind of Object.keys(kept)) {
    for (const e of kept[kind]) console.log(`  ${isDelete(e) ? '-' : e.diff[0].kind === 'N' ? '+' : '~'} ${kind.slice(0, -1)} ${label(e)}`);
  }
  for (const s of skipped) console.log(`  · left as it is: ${s}`);
  if (skipped.length) console.log('    Not applied because they could lose data. Back up first, then re-run with --allow-deletes / --allow-alter if they are wanted.');

  const changes = kept.collections.length + kept.fields.length + kept.relations.length;
  if (!changes) return console.log('  = nothing to add or change');
  if (DRY) return console.log(`  (dry run: ${changes} change(s) not applied)`);
  await api('/schema/apply', { method: 'POST', body: { hash: diff.hash, diff: { ...kept, systemFields: diff.diff.systemFields || [] } } });
  console.log(`  ✓ ${changes} change(s) applied`);
}

/* ───────────────────────────── 2. permissions ──────────────────────────── */

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

async function permissions() {
  console.log('\n  --- 2. website permissions (cms/schema/website-policy.json) ---\n');
  const { policy, permissions: wanted } = readJson('schema/website-policy.json');

  let [found] = (await api(`/policies?filter=${q({ name: { _eq: policy.name } })}&fields=id&limit=1`)) || [];
  if (!found) {
    console.log(`  + policy "${policy.name}"`);
    if (DRY) return console.log('  (dry run: its permissions would be added next)');
    found = await api('/policies', { method: 'POST', body: policy });
  }

  const current = (await api(`/permissions?filter=${q({ policy: { _eq: found.id } })}&fields=id,collection,action,fields,permissions,validation,presets&limit=-1`)) || [];
  const key = (p) => `${p.action} ${p.collection}`;
  const byKey = new Map(current.map((p) => [key(p), p]));

  for (const want of wanted) {
    const have = byKey.get(key(want));
    byKey.delete(key(want));
    const body = { fields: want.fields, permissions: want.permissions, validation: want.validation, presets: want.presets };
    if (!have) {
      console.log(`  + ${key(want)}`);
      if (!DRY) await api('/permissions', { method: 'POST', body: { policy: found.id, collection: want.collection, action: want.action, ...body } });
    } else if (!same(have.fields, want.fields) || !same(have.permissions, want.permissions) || !same(have.validation, want.validation) || !same(have.presets, want.presets)) {
      console.log(`  ~ ${key(want)}`);
      if (!DRY) await api(`/permissions/${have.id}`, { method: 'PATCH', body });
    }
  }
  for (const extra of byKey.values()) console.log(`  · kept (not in the file): ${key(extra)}`);
  console.log('  = done');
}

/* ─────────────────────────────── 3. content ────────────────────────────── */

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const uploaded = new Map();

/** { file, title } in the seed → an uploaded Directus file id (each file once). */
async function upload(ref) {
  const path = resolve(CMS_DIR, 'seed', ref.file);
  if (uploaded.has(path)) return uploaded.get(path);
  const form = new FormData();
  if (ref.title) form.append('title', ref.title);
  form.append('file', new Blob([readFileSync(path)], { type: MIME[extname(path).toLowerCase()] || 'application/octet-stream' }), basename(path));
  const { id } = await api('/files', { method: 'POST', form });
  uploaded.set(path, id);
  return id;
}

async function withFiles(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) out[k] = v && typeof v === 'object' && !Array.isArray(v) && 'file' in v ? await upload(v) : v;
  return out;
}

const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
const exists = (collection) => api(`/collections/${collection}`).then(() => true, () => false);

async function content() {
  console.log('\n  --- 3. starting content (cms/seed/content.json) ---\n');
  const seed = readJson('seed/content.json');
  if (seed.kind !== 'antisocialtalks-cms-seed') throw new Error('cms/seed/content.json is not an AntiSocialTalks seed file');

  for (const [collection, values] of Object.entries(seed.singletons)) {
    if (DRY && !(await exists(collection))) { console.log(`  + ${collection} (after the schema step)`); continue; }
    // Settings records: only the fields that are still empty get the starting value (e.g. a field
    // added in a later release); anything the team has filled in is left exactly as it is.
    const have = (await api(`/items/${collection}`)) || {};
    const empty = Object.fromEntries(Object.entries(values).filter(([k]) => isEmpty(have[k])));
    if (!Object.keys(empty).length) { console.log(`  = ${collection} (already filled in, left as it is)`); continue; }
    console.log(`  + ${collection}: ${Object.keys(empty).join(', ')}`);
    if (!DRY) await api(`/items/${collection}`, { method: 'PATCH', body: await withFiles(empty) });
  }

  for (const [collection, rows] of Object.entries(seed.collections)) {
    if (DRY && !(await exists(collection))) { console.log(`  + ${collection}: ${rows.length} item(s) (after the schema step)`); continue; }
    const [{ count } = { count: 0 }] = (await api(`/items/${collection}?aggregate[count]=*`)) || [];
    if (Number(count) > 0) { console.log(`  = ${collection} (${count} item(s), left as they are)`); continue; }
    console.log(`  + ${collection}: ${rows.length} item(s)`);
    if (!DRY) for (const row of rows) await api(`/items/${collection}`, { method: 'POST', body: await withFiles(row) });
  }

  for (const [collection, updates] of Object.entries(seed.updates || {})) {
    for (const { match, set } of updates) {
      const where = `filter=${q(Object.fromEntries(Object.entries(match).map(([k, v]) => [k, { _eq: v }])))}`;
      // In a dry run the field may not exist yet (it comes with the schema step).
      const [row] = (await api(`/items/${collection}?${where}&fields=id,${Object.keys(set).join(',')}&limit=1`).catch((e) => (DRY ? api(`/items/${collection}?${where}&fields=id&limit=1`) : Promise.reject(e)))) || [];
      if (!row) { console.log(`  · ${collection} ${JSON.stringify(match)} not found, skipped`); continue; }
      const empty = Object.fromEntries(Object.entries(set).filter(([k]) => row[k] == null || (Array.isArray(row[k]) && !row[k].length)));
      if (!Object.keys(empty).length) continue;
      console.log(`  ~ ${collection} ${JSON.stringify(match)}: ${Object.keys(empty).join(', ')}`);
      if (!DRY) await api(`/items/${collection}/${row.id}`, { method: 'PATCH', body: empty });
    }
  }
  console.log('  = done');
}

/* ───────────────────────────────── run ─────────────────────────────────── */

console.log(`\n  AntiSocialTalks CMS: ${BASE}${DRY ? '  (dry run, nothing is changed)' : ''}`);
try {
  await login();
  await schema();
  await permissions();
  if (!args.has('--skip-content')) await content();
  console.log(`\n  Done.${DRY ? ' Nothing was changed.' : ''}\n`);
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
