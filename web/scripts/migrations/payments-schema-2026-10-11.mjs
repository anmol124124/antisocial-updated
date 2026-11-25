#!/usr/bin/env node
/**
 * Payments (Razorpay) and paid event booking: CMS schema (2026-10-11).
 *
 * Creates or adds, only when missing:
 *   orders                       one row per payment (shop order or event ticket)
 *   events.ticket_price          price per person; empty = free event
 *   events.ticket_currency       e.g. INR or AED
 *   event_registrations.payment_status, and an "Awaiting payment" status
 *
 * Then gives the website's policy what payments need: create/read/update
 * orders, read the seat-count fields of registrations (no names, emails or
 * phones), and update a registration's status once it is paid.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/migrations/payments-schema-2026-10-11.mjs
 *
 * Idempotent: safe to re-run.
 */

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;
const WEBSITE_POLICY = 'Website (read content, create submissions)';

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

const pk = { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } };
const text = (field, meta = {}) => ({ field, type: 'string', meta: { interface: 'input', width: 'half', ...meta } });
const long = (field, meta = {}) => ({ field, type: 'text', meta: { interface: 'input-multiline', ...meta } });
const int = (field, meta = {}) => ({ field, type: 'integer', meta: { interface: 'input', width: 'half', ...meta } });
const float = (field, meta = {}) => ({ field, type: 'float', meta: { interface: 'input', width: 'half', ...meta } });
const json = (field, meta = {}) => ({ field, type: 'json', meta: { interface: 'input-code', options: { language: 'json' }, ...meta } });
const m2o = (field, meta = {}) => ({ field, type: 'integer', meta: { interface: 'select-dropdown-m2o', special: ['m2o'], ...meta } });
const timestamp = (field, meta = {}) => ({ field, type: 'timestamp', meta: { interface: 'datetime', width: 'half', ...meta } });
const created = { field: 'date_created', type: 'timestamp', meta: { special: ['date-created'], interface: 'datetime', readonly: true, width: 'half' } };
const choices = (list) => ({ choices: list.map(([t, v]) => ({ text: t, value: v })) });
const choice = (field, list, def, meta = {}) => ({
  field,
  type: 'string',
  schema: { default_value: def },
  meta: { interface: 'select-dropdown', display: 'labels', width: 'half', options: choices(list), ...meta },
});

const ORDERS = {
  collection: 'orders',
  meta: {
    icon: 'payments',
    note: 'Every Razorpay payment: shop orders and event tickets. "Fulfilment failed" means paid but not sent to Gelato, so place it by hand.',
  },
  schema: {},
  fields: [
    pk,
    choice('kind', [['Shop order', 'shop'], ['Event ticket', 'ticket']], 'shop', { readonly: true }),
    choice(
      'status',
      [
        ['Awaiting payment', 'pending'],
        ['Paid', 'paid'],
        ['Sent to Gelato', 'fulfilled'],
        ['Fulfilment failed', 'fulfilment_failed'],
        ['Cancelled', 'cancelled'],
      ],
      'pending',
    ),
    text('description', { width: 'full', readonly: true }),
    float('amount', { readonly: true, note: 'Total charged, in major units.' }),
    int('amount_minor', { readonly: true, hidden: true }),
    text('currency', { readonly: true }),
    float('shipping_amount', { readonly: true }),
    text('customer_name', { readonly: true }),
    text('email', { readonly: true }),
    text('phone', { readonly: true }),
    json('lines', { readonly: true }),
    json('shipping_address', { readonly: true }),
    text('shipment_method_uid', { readonly: true }),
    m2o('event', { readonly: true }),
    m2o('registration', { readonly: true }),
    text('razorpay_order_id', { readonly: true }),
    text('razorpay_payment_id', { readonly: true }),
    text('gelato_order_id', { readonly: true }),
    long('notes'),
    created,
    timestamp('date_paid', { readonly: true }),
  ],
};

const RELATIONS = [
  { collection: 'orders', field: 'event', related_collection: 'events', schema: { on_delete: 'SET NULL' } },
  { collection: 'orders', field: 'registration', related_collection: 'event_registrations', schema: { on_delete: 'SET NULL' } },
];

const NEW_FIELDS = {
  events: [
    float('ticket_price', { note: 'Price per person. Leave empty for a free event. Booking opens when the status is Registration Open.' }),
    text('ticket_currency', { note: 'INR, AED or USD. Defaults to INR.' }),
  ],
  event_registrations: [
    choice('payment_status', [['Free', 'not_required'], ['Pending', 'pending'], ['Paid', 'paid'], ['Refunded', 'refunded']], 'not_required'),
  ],
};

const REGISTRATION_STATUSES = [
  ['Received', 'received'],
  ['Awaiting payment', 'awaiting_payment'],
  ['Place confirmed', 'confirmed'],
  ['Waitlist', 'waitlist'],
  ['Cancelled', 'cancelled'],
];

console.log(`\n  Payments setup for ${BASE}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  console.log('  --- orders ---');
  try {
    await api('/collections/orders');
    console.log('  = orders exists');
  } catch (err) {
    if (err.status !== 403 && err.status !== 404) throw err;
    await api('/collections', { method: 'POST', body: ORDERS });
    console.log('  + orders created');
  }
  for (const rel of RELATIONS) {
    try {
      await api(`/relations/${rel.collection}/${rel.field}`);
      console.log(`  = ${rel.collection}.${rel.field}`);
    } catch (err) {
      if (err.status !== 403 && err.status !== 404) throw err;
      await api('/relations', { method: 'POST', body: rel });
      console.log(`  + ${rel.collection}.${rel.field} -> ${rel.related_collection}`);
    }
  }

  console.log('\n  --- new fields ---');
  for (const [collection, fields] of Object.entries(NEW_FIELDS)) {
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
  await api('/fields/event_registrations/status', {
    method: 'PATCH',
    body: { meta: { options: choices(REGISTRATION_STATUSES) } },
  });
  console.log('  + event_registrations.status now includes "Awaiting payment"');

  console.log('\n  --- website permissions ---');
  const policy = (await api(`/policies?filter=${q({ name: { _eq: WEBSITE_POLICY } })}&fields=id&limit=1`))?.[0];
  if (!policy) throw new Error('website policy not found: run ../cms/scripts/create-site-token.mjs first.');

  const existing = (await api(`/permissions?filter=${q({ policy: { _eq: policy.id } })}&fields=collection,action&limit=-1`)) || [];
  const have = new Set(existing.map((p) => `${p.collection}:${p.action}`));
  const wanted = [
    { collection: 'orders', action: 'create', fields: ['*'] },
    { collection: 'orders', action: 'read', fields: ['*'] },
    { collection: 'orders', action: 'update', fields: ['*'] },
    // Seat counting only: no names, emails or phone numbers.
    { collection: 'event_registrations', action: 'read', fields: ['id', 'event', 'kind', 'status', 'attendees', 'payment_status', 'date_created'] },
    { collection: 'event_registrations', action: 'update', fields: ['status', 'payment_status'] },
  ].filter((p) => !have.has(`${p.collection}:${p.action}`));

  if (wanted.length) {
    await api('/permissions', {
      method: 'POST',
      body: wanted.map((p) => ({ ...p, policy: policy.id, permissions: {}, validation: {} })),
    });
    for (const p of wanted) console.log(`  + ${p.action.padEnd(6)} ${p.collection}`);
  } else {
    console.log('  = already in place');
  }

  console.log('\n  Done. Set a ticket price on an event to make its booking paid.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
