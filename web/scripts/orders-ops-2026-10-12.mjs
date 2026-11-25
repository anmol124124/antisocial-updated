#!/usr/bin/env node
/**
 * Orders after payment (2026-10-12): shipping, cancel/refund and unfinished
 * checkouts. Adds to the `orders` collection, only when missing:
 *
 *   status options   Shipped, Delivered, Cancel and refund, Refund only,
 *                    Refunded, Cancel failed, Refund failed, Abandoned
 *   fields           gelato_status, tracking_code, tracking_url, date_shipped,
 *                    shipped_notified, refund_id, date_refunded
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/orders-ops-2026-10-12.mjs
 *
 * Run after scripts/payments-schema-2026-10-11.mjs. Safe to re-run.
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
    const err = new Error(`${method} ${path}: ${json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
    err.status = res.status;
    throw err;
  }
  return json?.data;
}

const STATUSES = [
  ['Awaiting payment', 'pending'],
  ['Paid', 'paid'],
  ['Sent to Gelato', 'fulfilled'],
  ['Shipped', 'shipped'],
  ['Delivered', 'delivered'],
  ['Fulfilment failed', 'fulfilment_failed'],
  ['Cancel and refund', 'cancel_requested'],
  ['Refund only', 'refund_requested'],
  ['Refunded', 'refunded'],
  ['Cancel failed', 'cancel_failed'],
  ['Refund failed', 'refund_failed'],
  ['Abandoned checkout', 'abandoned'],
  ['Cancelled', 'cancelled'],
];

const ro = { readonly: true, width: 'half' };
const FIELDS = [
  { field: 'gelato_status', type: 'string', meta: { interface: 'input', ...ro, note: 'Latest status reported by Gelato.' } },
  { field: 'tracking_code', type: 'string', meta: { interface: 'input', ...ro } },
  { field: 'tracking_url', type: 'string', meta: { interface: 'input', readonly: true, width: 'full' } },
  { field: 'date_shipped', type: 'timestamp', meta: { interface: 'datetime', ...ro } },
  { field: 'shipped_notified', type: 'boolean', schema: { default_value: false }, meta: { interface: 'boolean', ...ro, note: 'Shipping email sent to the customer.' } },
  { field: 'refund_id', type: 'string', meta: { interface: 'input', ...ro } },
  { field: 'date_refunded', type: 'timestamp', meta: { interface: 'datetime', ...ro } },
];

console.log(`\n  Orders: shipping and refunds, for ${BASE}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  await api('/collections/orders').catch(() => {
    throw new Error('orders collection missing: run scripts/payments-schema-2026-10-11.mjs first.');
  });

  for (const f of FIELDS) {
    try {
      await api(`/fields/orders/${f.field}`);
      console.log(`  = orders.${f.field}`);
    } catch (err) {
      if (err.status !== 403 && err.status !== 404) throw err;
      await api('/fields/orders', { method: 'POST', body: f });
      console.log(`  + orders.${f.field}`);
    }
  }

  await api('/fields/orders/status', {
    method: 'PATCH',
    body: {
      meta: {
        options: { choices: STATUSES.map(([text, value]) => ({ text, value })) },
        note: 'To cancel or refund, choose "Cancel and refund" or "Refund only" and save; the site does the rest within a few minutes.',
      },
    },
  });
  console.log('  + orders.status: shipping, refund and abandoned options');

  console.log('\n  Done.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
