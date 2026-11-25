#!/usr/bin/env node
/**
 * Before live payments (27 Oct 2026): each order records whether it was paid
 * with live Stripe keys, because staging (test keys) and the live site share
 * one CMS. Each site's order job (refunds, missed payments, shipping emails)
 * then only touches its own orders: a test key cannot refund a live payment,
 * and staging must never mark a real order "refund failed" or "abandoned".
 *
 * CMS changes:
 *   orders.livemode   ticked = real money (live site); empty = Stripe test mode
 *
 * Run this BEFORE deploying the code that writes the field.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/stripe-livemode-2026-10-27.mjs
 *
 * Safe to re-run. Orders already in the CMS stay test orders (the live site
 * took no payments before this).
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
  if (!res.ok) {
    const err = new Error(`${method} ${path.split('?')[0]}: ${json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
    err.status = res.status;
    throw err;
  }
  return json?.data;
}

const LIVEMODE = {
  field: 'livemode',
  type: 'boolean',
  schema: { default_value: false },
  meta: {
    interface: 'boolean',
    readonly: true,
    width: 'half',
    options: { label: 'Real money (live Stripe)' },
    note: 'Ticked: paid on the live site with live Stripe keys. Unticked: a Stripe test payment from staging; nothing was charged.',
  },
};

console.log(`\n  Orders: live or test, for ${BASE}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  try {
    await api(`/fields/orders/${LIVEMODE.field}`);
    console.log('  = orders.livemode');
  } catch (err) {
    if (err.status !== 403 && err.status !== 404) throw err;
    await api('/fields/orders', { method: 'POST', body: LIVEMODE });
    console.log('  + orders.livemode ("Real money (live Stripe)")');
  }

  console.log('\n  Done. Now deploy the code to staging and the live site.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
