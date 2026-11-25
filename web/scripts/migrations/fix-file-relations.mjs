#!/usr/bin/env node
/**
 * Repairs the image fields so the Directus UI can actually attach files.
 *
 * cms/provision-schema.js and scripts/migrations/seed-directus.mjs created hosts.photo,
 * guests.photo, topics.image and shop_products.mockup as file-image fields but
 * never created their relation to directus_files. Without that relation the
 * image interface uploads the file into the File Library and then fails to
 * save it on the item — so every photo stayed null.
 *
 * This script:
 *   1. creates the four missing relations (idempotent);
 *   2. lists what is in the File Library;
 *   3. links an uploaded file to a guest/host whose photo is empty when the
 *      file's title or filename contains every part of that person's name —
 *      only when exactly one file matches, so nothing is guessed.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/migrations/fix-file-relations.mjs
 */

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;

const FILE_FIELDS = [
  ['hosts', 'photo'],
  ['guests', 'photo'],
  ['topics', 'image'],
  ['shop_products', 'mockup'],
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
    const err = new Error(`${method} ${path}: ${json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
    err.status = res.status;
    throw err;
  }
  return json?.data;
}

const q = (o) => encodeURIComponent(JSON.stringify(o));

/** "Dr. Anmol Kapoor" -> ["anmol", "kapoor"]; titles like "Dr." carry no signal. */
function nameParts(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 1 && !['dr', 'mr', 'mrs', 'ms'].includes(p));
}

function haystack(file) {
  return `${file.title || ''} ${file.filename_download || ''}`.toLowerCase().normalize('NFKD');
}

console.log(`\n  Image-field repair for ${BASE}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  /* 1. relations */
  console.log('  --- relations ---');
  for (const [collection, field] of FILE_FIELDS) {
    try {
      await api(`/fields/${collection}/${field}`);
    } catch {
      console.log(`  - ${collection}.${field}: field does not exist here, skipping`);
      continue;
    }
    try {
      await api(`/relations/${collection}/${field}`);
      console.log(`  = ${collection}.${field} already linked to files`);
    } catch (err) {
      if (err.status !== 403 && err.status !== 404) throw err;
      await api('/relations', {
        method: 'POST',
        body: {
          collection,
          field,
          related_collection: 'directus_files',
          schema: { on_delete: 'SET NULL' },
        },
      });
      console.log(`  + ${collection}.${field} -> directus_files`);
    }
  }

  /* 2. what is in the library */
  const files =
    (await api('/files?fields=id,title,filename_download,type,uploaded_on&sort=-uploaded_on&limit=-1')) || [];
  const images = files.filter((f) => String(f.type || '').startsWith('image/'));
  console.log(`\n  --- File Library: ${images.length} image(s) ---`);
  for (const f of images) console.log(`    ${f.filename_download}${f.title ? `  ("${f.title}")` : ''}`);

  /* 3. link unambiguous matches */
  console.log('\n  --- linking ---');
  const usedFileIds = new Set();
  for (const collection of ['guests', 'hosts']) {
    const people =
      (await api(`/items/${collection}?fields=id,name,photo&limit=-1`)) || [];
    for (const person of people) {
      if (person.photo) {
        usedFileIds.add(person.photo);
        continue;
      }
      const parts = nameParts(person.name);
      const matches = images.filter(
        (f) => !usedFileIds.has(f.id) && parts.every((p) => haystack(f).includes(p)),
      );
      if (matches.length === 1) {
        await api(`/items/${collection}/${person.id}`, { method: 'PATCH', body: { photo: matches[0].id } });
        usedFileIds.add(matches[0].id);
        console.log(`  + ${person.name}  <-  ${matches[0].filename_download}`);
      } else if (matches.length > 1) {
        console.log(`  ? ${person.name}: ${matches.length} files match — attach the right one in the CMS`);
      } else {
        console.log(`  · ${person.name}: no file named after them — attach in the CMS`);
      }
    }
  }

  console.log('\n  Done. Any guest still without a photo: open it in the CMS ->');
  console.log('  photo -> "Select from library" -> pick the image -> Save (top-right ✓).\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
