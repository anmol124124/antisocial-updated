#!/usr/bin/env node
/**
 * Stripe and Qikink (20 Oct 2026). The selling company is in Canada, so
 * payments move from Razorpay to Stripe; orders delivered in India are
 * printed by Qikink, with delivery included in the price.
 *
 * CMS changes, only if missing:
 *   orders          stripe_session_id, stripe_payment_intent, fulfilment_provider,
 *                   qikink_order_id, qikink_status
 *   shop_products   qikink (JSON: SKU template, sizes, print sizes)
 *
 * And for every product in merch/products.json that is in the CMS:
 *   qikink           set from the file
 *   prices.INR, price  the India price from the file (other currencies untouched)
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/migrations/stripe-qikink-2026-10-20.mjs [merch/products.json]
 *
 * Safe to re-run.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;
const LIST = resolve(process.argv[2] || 'merch/products.json');

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
    const err = new Error(`${method} ${path.split('?')[0]}: ${json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
    err.status = res.status;
    throw err;
  }
  return json?.data;
}

const q = (o) => encodeURIComponent(JSON.stringify(o));
const text = (field, note, meta = {}) => ({ field, type: 'string', meta: { interface: 'input', width: 'half', readonly: true, note, ...meta } });

const FIELDS = {
  orders: [
    text('stripe_session_id', 'Stripe Checkout session (cs_...).'),
    text('stripe_payment_intent', 'Stripe payment (pi_...). Search for it in the Stripe dashboard.'),
    {
      field: 'fulfilment_provider',
      type: 'string',
      meta: {
        interface: 'select-dropdown',
        display: 'labels',
        width: 'half',
        readonly: true,
        note: 'Who prints it: Qikink for India, Gelato elsewhere.',
        options: { choices: [{ text: 'Gelato', value: 'gelato' }, { text: 'Qikink', value: 'qikink' }] },
      },
    },
    text('qikink_order_id', 'Qikink order id (India orders).'),
    text('qikink_status', 'Status at Qikink, updated every few minutes.'),
  ],
  shop_products: [
    {
      field: 'qikink',
      type: 'json',
      meta: {
        interface: 'input-code',
        options: { language: 'json' },
        note:
          'India (Qikink): { "sku_template": "UHd-{color}-{size}", "color_codes": { "Black": "Bk", "Grey": "Gm" }, "sizes": ["S","M"], "size_codes": { "2XL": "XXL" }, "print_type_id": 1, "designs": { "fr": { "width": 11.25, "height": 15 }, "bk": { "width": 11.25, "height": 15 } } }. Empty = not sold in India.',
      },
    },
  ],
};

console.log(`\n  Stripe and Qikink setup for ${BASE}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  for (const [collection, fields] of Object.entries(FIELDS)) {
    for (const f of fields) {
      try {
        await api(`/fields/${collection}/${f.field}`);
        console.log(`  = ${collection}.${f.field}`);
      } catch (err) {
        if (err.status !== 403 && err.status !== 404) throw err;
        await api(`/fields/${collection}`, { method: 'POST', body: f });
        console.log(`  + ${collection}.${f.field}`);
      }
    }
  }

  console.log('\n  --- products ---');
  const input = JSON.parse(readFileSync(LIST, 'utf8'));
  const products = Array.isArray(input) ? input : input.products || [];
  for (const p of products) {
    const [row] = (await api(`/items/shop_products?filter=${q({ slug: { _eq: p.slug } })}&fields=id,title,prices,qikink&limit=1`)) || [];
    if (!row) {
      console.log(`  x ${p.slug}: not in the CMS (run scripts/shop/add-products.mjs first)`);
      continue;
    }
    const inr = Number(p.prices?.INR);
    const update = {};
    if (p.qikink && JSON.stringify(p.qikink) !== JSON.stringify(row.qikink)) update.qikink = p.qikink;
    if (inr > 0 && Number(row.prices?.INR) !== inr) {
      update.prices = { ...(row.prices || {}), INR: inr };
      update.price = inr;
      update.currency = 'INR';
    }
    if (!Object.keys(update).length) {
      console.log(`  = ${row.title}`);
      continue;
    }
    await api(`/items/shop_products/${row.id}`, { method: 'PATCH', body: update });
    console.log(`  ~ ${row.title}:${update.prices ? ` India ₹${inr}` : ''}${update.qikink ? ` Qikink ${p.qikink.sku_template}` : ''}`);
  }

  console.log('\n  Done. Prices show on the site within a minute.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
