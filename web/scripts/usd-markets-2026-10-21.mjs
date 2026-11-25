#!/usr/bin/env node
/**
 * One price list outside India (21 Oct 2026): India pays in rupees, and every
 * other market (US, Canada, UK, UAE) pays in US dollars. This drops the GBP
 * and AED prices from every product, keeping INR and USD as they are in the
 * CMS, and updates the note on the prices field.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/usd-markets-2026-10-21.mjs
 *
 * Safe to re-run. The old prices are printed before they are removed.
 */

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;

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
  if (!res.ok) throw new Error(`${method} ${path.split('?')[0]}: ${json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
  return json?.data;
}

const KEEP = ['INR', 'USD'];

console.log(`\n  INR for India, USD everywhere else: ${BASE}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  await api('/fields/shop_products/prices', {
    method: 'PATCH',
    body: { meta: { note: 'Price per currency: { "INR": 999, "USD": 39 }. India pays INR; the US, Canada, the UK and the UAE pay USD.' } },
  });
  console.log('  ~ shop_products.prices note');

  const rows = (await api('/items/shop_products?fields=id,title,prices&limit=-1')) || [];
  for (const row of rows) {
    const prices = row.prices && typeof row.prices === 'object' ? row.prices : {};
    const dropped = Object.keys(prices).filter((c) => !KEEP.includes(c));
    if (!dropped.length) {
      console.log(`  = ${row.title}`);
      continue;
    }
    if (!(Number(prices.USD) > 0)) {
      console.log(`  ! ${row.title}: no USD price, left as it is. Add one in the CMS, then re-run.`);
      continue;
    }
    const kept = Object.fromEntries(KEEP.filter((c) => prices[c] != null).map((c) => [c, prices[c]]));
    await api(`/items/shop_products/${row.id}`, { method: 'PATCH', body: { prices: kept } });
    console.log(`  ~ ${row.title}: removed ${dropped.map((c) => `${c} ${prices[c]}`).join(', ')}; now ${JSON.stringify(kept)}`);
  }

  console.log('\n  Done. Prices show on the site within a minute.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
