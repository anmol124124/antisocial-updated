#!/usr/bin/env node
/**
 * Sends each published shop product to Gelato as a DRAFT order, built exactly
 * the way a paid order is (product UID per size, a print file per placement,
 * the market's currency). Drafts are never printed or charged; they appear in
 * the Gelato dashboard under Orders, with a print preview of each design.
 *
 *   node scripts/shop/test-gelato-order.mjs                       every product, size M, India
 *   node scripts/shop/test-gelato-order.mjs --country all         every product to India, US, UK and UAE
 *   node scripts/shop/test-gelato-order.mjs hoodie-fit-in --country GB
 *   node scripts/shop/test-gelato-order.mjs --delete <gelato-order-id> [...]
 *
 * Remove all test drafts afterwards with scripts/shop/gelato-clean-orders.mjs --delete.
 *
 * Needs DIRECTUS_URL, DIRECTUS_EMAIL, DIRECTUS_PASSWORD and GELATO_API_KEY
 * (environment or web/.env.local).
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
const ORDER_API = 'https://order.gelatoapis.com/v4';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

/** One test address and the shop currency for each market. */
const MARKETS = {
  IN: {
    currency: 'INR',
    address: { firstName: 'Test', lastName: 'Order', addressLine1: '1 MG Road', city: 'Bengaluru', state: 'KA', postCode: '560001', country: 'IN', email: 'test@example.com', phone: '+919999999999' },
  },
  US: {
    currency: 'USD',
    address: { firstName: 'Test', lastName: 'Order', addressLine1: '350 5th Ave', city: 'New York', state: 'NY', postCode: '10118', country: 'US', email: 'test@example.com', phone: '+12125550100' },
  },
  GB: {
    currency: 'GBP',
    address: { firstName: 'Test', lastName: 'Order', addressLine1: '10 Downing St', city: 'London', postCode: 'SW1A 2AA', country: 'GB', email: 'test@example.com', phone: '+442071234567' },
  },
  AE: {
    currency: 'AED',
    address: { firstName: 'Test', lastName: 'Order', addressLine1: 'Sheikh Zayed Road 1', city: 'Dubai', state: 'Dubai', postCode: '00000', country: 'AE', email: 'test@example.com', phone: '+971500000000' },
  },
};

async function gelato(path, init = {}) {
  const res = await fetch(`${ORDER_API}${path}`, {
    ...init,
    headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const details = (json?.details || []).map((d) => d.message).filter(Boolean).join('; ');
    throw new Error(`Gelato ${res.status}: ${json?.message || res.statusText}${details ? ` (${details})` : ''}`);
  }
  return json;
}

const money = (amount, currency) => (amount == null ? '?' : `${currency} ${Number(amount).toFixed(2)}`);

async function main() {
  if (!KEY) throw new Error('GELATO_API_KEY is not set.');

  if (args[0] === '--delete') {
    for (const id of args.slice(1)) {
      await gelato(`/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
      console.log(`  - deleted draft ${id}`);
    }
    return;
  }

  const countryArg = (flag('--country') || 'IN').toUpperCase();
  const countries = countryArg === 'ALL' ? Object.keys(MARKETS) : [countryArg];
  for (const c of countries) {
    if (!MARKETS[c]) throw new Error(`--country must be one of ${Object.keys(MARKETS).join(', ')} or all`);
  }
  const only = args.find((a) => !a.startsWith('--') && a.toUpperCase() !== countryArg);

  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.DIRECTUS_EMAIL, password: process.env.DIRECTUS_PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`CMS login failed: ${lj?.errors?.[0]?.message || login.status}`);
  const token = lj.data.access_token;

  const q = encodeURIComponent(JSON.stringify({ status: { _eq: 'published' } }));
  const res = await fetch(`${BASE}/items/shop_products?filter=${q}&fields=*&sort=sort,id&limit=-1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const products = ((await res.json()).data || []).filter((p) => !only || p.slug === only);
  if (!products.length) throw new Error(only ? `no published product with slug "${only}"` : 'no published products');

  console.log(`\n  Gelato DRAFT orders: ${products.length} product(s) x ${countries.join(', ')} (nothing is printed or charged)\n`);
  const made = [];
  let failed = 0;

  for (const p of products) {
    const variants = Array.isArray(p.variants) ? p.variants : [];
    const variant = variants.find((v) => v.size === 'M') || variants[0];
    const uid = variant?.uid || p.gelato_product_uid;
    const files =
      p.print_files && typeof p.print_files === 'object'
        ? Object.entries(p.print_files).map(([type, url]) => ({ type, url }))
        : p.print_file_url
          ? [{ type: 'default', url: p.print_file_url }]
          : [];

    console.log(`  ${p.title}${variant?.size ? ` (${variant.size})` : ''}  files: ${files.map((f) => f.type).join(' + ')}`);

    // Gelato downloads the print files itself, so they must be reachable from the internet.
    try {
      for (const f of files) {
        const r = await fetch(f.url);
        const type = r.headers.get('content-type') || '';
        await r.arrayBuffer();
        if (!r.ok || !type.startsWith('image/')) throw new Error(`print file for ${f.type} not reachable (${r.status} ${type})`);
      }
    } catch (err) {
      console.log(`    x ${err.message}`);
      failed += countries.length;
      continue;
    }

    for (const c of countries) {
      const { currency, address } = MARKETS[c];
      try {
        const reference = `AST-TEST-${c}-${p.slug}-${Date.now()}`;
        const order = await gelato('/orders', {
          method: 'POST',
          body: JSON.stringify({
            orderType: 'draft',
            orderReferenceId: reference,
            customerReferenceId: address.email,
            currency,
            shippingAddress: address,
            items: [{ itemReferenceId: `${reference}-1`, productUid: uid, quantity: 1, files }],
          }),
        });
        made.push(order.id);
        const item = order.items?.[0] || {};
        const ship = order.shipment || {};
        console.log(
          `    + ${c}: draft ${order.id}  item ${money(item.price, currency)}` +
            `${ship.price != null ? `, shipping ${money(ship.price, currency)}` : ''}` +
            `${ship.fulfillmentCountry ? `, printed in ${ship.fulfillmentCountry}` : ''}`,
        );
      } catch (err) {
        failed++;
        console.log(`    x ${c}: ${err.message}`);
      }
    }
  }

  console.log(`\n  ${made.length} draft order(s) created${failed ? `, ${failed} failed` : ''}.`);
  if (made.length) {
    console.log('  See them in https://dashboard.gelato.com -> Orders (Drafts), each with a print preview.');
    console.log('  Remove them all afterwards:  node scripts/shop/gelato-clean-orders.mjs --delete\n');
  }
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exitCode = 1;
});
