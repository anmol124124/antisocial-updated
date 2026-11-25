#!/usr/bin/env node
/**
 * Replaces each shop product's photos with Gelato's own previews: the real
 * blank garment with our print files placed exactly where Gelato will print
 * them. One front and one back image per product.
 *
 *   node scripts/shop/gelato-previews.mjs              every product
 *   node scripts/shop/gelato-previews.mjs hoodie       one product (by slug)
 *
 * How: for each side it sends a DRAFT order (front-only or back-only version
 * of the product, size M), waits for Gelato to render the preview, saves it to
 * the CMS as the product's `mockup` / `mockup_back`, then deletes the draft.
 * Drafts are never printed or charged.
 *
 * Needs DIRECTUS_URL, DIRECTUS_EMAIL, DIRECTUS_PASSWORD and GELATO_API_KEY
 * (environment or web/.env.local). Run after scripts/shop/add-products.mjs, since
 * Gelato downloads the print files from the public site.
 */

import { readFileSync } from 'node:fs';
import { ENV_LOCAL } from '../lib/paths.mjs';

try {
  for (const line of readFileSync(ENV_LOCAL, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  /* no .env.local */
}

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const KEY = process.env.GELATO_API_KEY;
const only = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (o) => encodeURIComponent(JSON.stringify(o));

const ADDRESS = {
  firstName: 'Preview', lastName: 'Only', addressLine1: '1 MG Road', city: 'Bengaluru', state: 'KA',
  postCode: '560001', country: 'IN', email: 'preview@example.com', phone: '+919999999999',
};

let token = '';
async function cms(path, { method = 'GET', body, raw } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(raw ? {} : { 'Content-Type': 'application/json' }) },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`CMS ${method} ${path.split('?')[0]}: ${json?.errors?.[0]?.message || res.status}`);
    err.status = res.status;
    throw err;
  }
  return json?.data;
}

async function gelato(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json' } });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`Gelato ${res.status}: ${json?.message || res.statusText}`);
  return json;
}

async function uidExists(uid) {
  const res = await fetch(`https://product.gelatoapis.com/v3/products/${encodeURIComponent(uid)}`, { headers: { 'X-API-KEY': KEY } });
  return res.ok;
}

/**
 * The same garment printed on one side only. "..._gpr_4-4_shsll_shslr" and
 * "..._gpr_4-4_sols_03996" become "..._gpr_4-0" / "..._gpr_0-4" (keeping the
 * maker suffix), so the preview shows that side alone.
 */
async function oneSidedUid(uid, side) {
  const m = uid.match(/^(.*_gpr_)([0-9]-[0-9])((?:_(?:shsll|shslr|inlbl|bcklbl))*)(.*)$/);
  if (!m) return uid;
  const candidate = `${m[1]}${side === 'front' ? '4-0' : '0-4'}${m[4]}`;
  return (await uidExists(candidate)) ? candidate : uid;
}

async function renderPreview(uid, files, label) {
  const order = await gelato('https://order.gelatoapis.com/v4/orders', {
    method: 'POST',
    body: JSON.stringify({
      orderType: 'draft',
      orderReferenceId: `AST-PREVIEW-${label}-${Date.now()}`,
      customerReferenceId: ADDRESS.email,
      currency: 'INR',
      shippingAddress: ADDRESS,
      items: [{ itemReferenceId: `${label}-1`, productUid: uid, quantity: 1, files }],
    }),
  });
  try {
    for (let i = 0; i < 20; i++) {
      await sleep(6000);
      const got = await gelato(`https://order.gelatoapis.com/v4/orders/${order.id}`);
      const preview = got.items?.[0]?.previews?.find((p) => p.type === 'preview_default');
      if (preview) {
        const img = await fetch(preview.url);
        if (!img.ok) throw new Error(`could not download preview (${img.status})`);
        return Buffer.from(await img.arrayBuffer());
      }
    }
    throw new Error('Gelato did not render a preview within two minutes');
  } finally {
    await gelato(`https://order.gelatoapis.com/v4/orders/${order.id}`, { method: 'DELETE' }).catch(() => {});
  }
}

async function uploadPng(bytes, title) {
  const old = (await cms(`/files?filter=${q({ title: { _eq: title } })}&fields=id&limit=-1`)) || [];
  const form = new FormData();
  form.append('title', title);
  form.append('file', new Blob([bytes], { type: 'image/png' }), `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`);
  const made = await cms('/files', { method: 'POST', raw: form });
  return { id: made.id, old: old.map((f) => f.id) };
}

async function main() {
  if (!KEY) throw new Error('GELATO_API_KEY is not set.');
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.DIRECTUS_EMAIL, password: process.env.DIRECTUS_PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`CMS login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  // Second photo field, created the first time this runs.
  try {
    await cms('/fields/shop_products/mockup_back');
  } catch (err) {
    if (err.status !== 403 && err.status !== 404) throw err;
    await cms('/fields/shop_products', {
      method: 'POST',
      body: { field: 'mockup_back', type: 'uuid', meta: { interface: 'file-image', special: ['file'], note: 'Back view. Filled by scripts/shop/gelato-previews.mjs.' } },
    });
    await cms('/relations', {
      method: 'POST',
      body: { collection: 'shop_products', field: 'mockup_back', related_collection: 'directus_files', schema: { on_delete: 'SET NULL' } },
    });
    console.log('  + shop_products.mockup_back field');
  }

  const products = ((await cms('/items/shop_products?fields=*&limit=-1')) || []).filter((p) => !only || p.slug === only);
  if (!products.length) throw new Error(only ? `no product with slug "${only}"` : 'no products');

  console.log(`\n  Gelato previews for ${products.length} product(s); about a minute each\n`);

  for (const p of products) {
    try {
      const variants = Array.isArray(p.variants) ? p.variants : [];
      const uid = (variants.find((v) => v.size === 'M') || variants[0])?.uid || p.gelato_product_uid;
      const prints = p.print_files && typeof p.print_files === 'object' ? p.print_files : { front: p.print_file_url };
      const update = {};
      const replaced = [];

      for (const side of ['front', 'back']) {
        const url = prints[side] || (side === 'front' ? prints.default : null);
        if (!url) continue;
        const sideUid = await oneSidedUid(uid, side);
        const png = await renderPreview(sideUid, [{ type: side, url }], `${p.slug}-${side}`);
        const file = await uploadPng(png, `Gelato preview: ${p.slug} ${side}`);
        update[side === 'front' ? 'mockup' : 'mockup_back'] = file.id;
        replaced.push(...file.old);
        console.log(`  + ${p.title}: ${side} preview`);
      }

      if (Object.keys(update).length) await cms(`/items/shop_products/${p.id}`, { method: 'PATCH', body: update });
      // Earlier previews of the same product are no longer used.
      for (const id of replaced) await cms(`/files/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch (err) {
      console.log(`  x ${p.title}: ${err.message}`);
      process.exitCode = 1;
    }
  }
  console.log('\n  Done. The shop shows the new photos within a minute.\n');
}

main().catch((err) => {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exitCode = 1;
});
