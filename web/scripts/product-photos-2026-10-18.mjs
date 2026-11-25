#!/usr/bin/env node
/**
 * Model photos as each product's main image (18 Oct 2026). Adds a `photo`
 * field to shop_products, only if missing, then uploads each product's photo
 * named in merch/products.json ("photo") and sets it. Nothing else on the
 * products changes: prices, sizes and descriptions stay as they are in the CMS.
 *
 * The shop shows `photo` first (square) and the front/back `mockup` under it
 * on the product page. Code from before this field ignores it, so a site
 * running older code keeps its current images until its code is updated.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/product-photos-2026-10-18.mjs [merch/products.json]
 *
 * Safe to re-run: an unchanged photo is not uploaded twice.
 */

import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;
const LIST = resolve(process.argv[2] || 'merch/products.json');

if (!EMAIL || !PASSWORD) {
  console.error('\n  Set DIRECTUS_EMAIL and DIRECTUS_PASSWORD (the admin login).\n');
  process.exit(1);
}

let token = '';
async function api(path, { method = 'GET', body, raw } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(raw ? {} : { 'Content-Type': 'application/json' }) },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
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
const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

/** Upload once: the title carries a fingerprint, as in scripts/add-products.mjs. */
async function upload(path, label) {
  const bytes = readFileSync(path);
  const title = `${label} [${createHash('sha1').update(bytes).digest('hex').slice(0, 10)}]`;
  const existing = (await api(`/files?filter=${q({ title: { _eq: title } })}&fields=id&limit=1`))?.[0];
  if (existing) return existing.id;
  const form = new FormData();
  form.append('title', title);
  form.append('file', new Blob([bytes], { type: TYPES[extname(path).toLowerCase()] || 'application/octet-stream' }), basename(path));
  return (await api('/files', { method: 'POST', raw: form })).id;
}

try {
  const input = JSON.parse(readFileSync(LIST, 'utf8'));
  const products = (Array.isArray(input) ? input : input.products || []).filter((p) => p.photo);
  console.log(`\n  Product photos: ${products.length} in ${basename(LIST)}, CMS ${BASE}\n`);

  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  try {
    await api('/fields/shop_products/photo');
    console.log('  = shop_products.photo');
  } catch (err) {
    if (err.status !== 403 && err.status !== 404) throw err;
    await api('/fields/shop_products', {
      method: 'POST',
      body: {
        field: 'photo',
        type: 'uuid',
        meta: {
          interface: 'file-image',
          special: ['file'],
          note: 'Main image, square: the product worn by a model. Shown first in the shop, with the mockup under it.',
        },
      },
    });
    await api('/relations', {
      method: 'POST',
      body: { collection: 'shop_products', field: 'photo', related_collection: 'directus_files', schema: { on_delete: 'SET NULL' } },
    });
    console.log('  + shop_products.photo field');
  }

  let failed = 0;
  for (const p of products) {
    try {
      const path = resolve(dirname(LIST), p.photo);
      if (!existsSync(path)) throw new Error(`photo file not found: ${p.photo}`);
      const [row] = (await api(`/items/shop_products?filter=${q({ slug: { _eq: p.slug } })}&fields=id,title,photo&limit=1`)) || [];
      if (!row) throw new Error('no product with this slug in the CMS (run scripts/add-products.mjs first)');
      const id = await upload(path, `Photo: ${p.slug}`);
      if (row.photo === id) {
        console.log(`  = ${row.title}`);
        continue;
      }
      await api(`/items/shop_products/${row.id}`, { method: 'PATCH', body: { photo: id } });
      console.log(`  + ${row.title}`);
    } catch (err) {
      failed++;
      console.log(`  x ${p.slug}: ${err.message}`);
    }
  }

  console.log(`\n  Done${failed ? `, ${failed} failed` : ''}.\n`);
  if (failed) process.exitCode = 1;
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
