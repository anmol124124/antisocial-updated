// Stand-ins for every outside service the site talks to: the Directus CMS,
// Stripe, Gelato, Qikink, Microsoft Graph and Resend. `installFetch()` routes the
// app's fetch calls to them by URL, so tests run the real code paths offline
// and can inspect exactly what was sent.
//
// The Directus stand-in is also served over HTTP for the end-to-end run
// (see tests/e2e/run.mjs), so it is written against plain Request/Response.

import { createHmac, randomUUID } from 'node:crypto';

export const DIRECTUS_URL = 'http://directus.test';

/* ─────────────────────────── Directus ─────────────────────────── */

const OPS = {
  _eq: (v, x) => v === x || (v != null && x != null && String(v) === String(x)),
  _neq: (v, x) => !OPS._eq(v, x),
  _in: (v, x) => Array.isArray(x) && x.some((y) => OPS._eq(v, y)),
  _nin: (v, x) => !OPS._in(v, x),
  _gt: (v, x) => v != null && v > x,
  _gte: (v, x) => v != null && v >= x,
  _lt: (v, x) => v != null && v < x,
  _lte: (v, x) => v != null && v <= x,
  _null: (v, x) => (x ? v == null : v != null),
  _nnull: (v, x) => (x ? v != null : v == null),
  _starts_with: (v, x) => typeof v === 'string' && v.startsWith(x),
  _contains: (v, x) => typeof v === 'string' && v.includes(x),
};

/** Directus filter JSON against one row (the subset of operators the site uses). */
export function matches(row, filter) {
  if (!filter || typeof filter !== 'object') return true;
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '_and') return cond.every((f) => matches(row, f));
    if (key === '_or') return cond.some((f) => matches(row, f));
    return Object.entries(cond).every(([op, expected]) => {
      const fn = OPS[op];
      if (!fn) throw new Error(`mock Directus: operator ${op} not supported`);
      return fn(row[key], expected);
    });
  });
}

function pickFields(row, fields) {
  if (!fields || fields.split(',').some((f) => f.trim() === '*')) return { ...row };
  const out = {};
  for (const f of fields.split(',')) {
    const top = f.trim().split('.')[0];
    if (top in row) out[top] = row[top];
  }
  return out;
}

function sortRows(rows, sort) {
  if (!sort) return rows;
  const keys = sort.split(',').map((k) => k.trim()).filter(Boolean);
  return [...rows].sort((a, b) => {
    for (const key of keys) {
      const desc = key.startsWith('-');
      const f = desc ? key.slice(1) : key;
      const x = a[f] ?? null;
      const y = b[f] ?? null;
      if (x === y) continue;
      if (x === null) return 1;
      if (y === null) return -1;
      return (x < y ? -1 : 1) * (desc ? -1 : 1);
    }
    return 0;
  });
}

const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * An in-memory Directus. `seed` is { collection: [rows] }. Files can be seeded
 * as { id, type, bytes }. Every request is appended to `.log`.
 */
export function createDirectus(seed = {}, { failCreate = [] } = {}) {
  const db = {};
  const ids = {};
  // Singleton collections (one record, e.g. site_settings): GET /items/<name> answers with the object.
  const singletons = { ...(seed.__singletons || {}) };
  for (const [col, rows] of Object.entries(seed)) {
    if (col === '__singletons') continue;
    db[col] = rows.map((r) => ({ ...r }));
    ids[col] = Math.max(0, ...db[col].map((r) => Number(r.id) || 0));
  }
  const files = new Map();
  const log = [];

  async function handle(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const method = request.method;
    log.push({ method, path: url.pathname, query: Object.fromEntries(url.searchParams) });

    if (parts[0] === 'items' && parts[1] in singletons && method === 'GET' && !parts[2]) {
      return json(200, { data: { id: 1, ...singletons[parts[1]] } });
    }

    if (parts[0] === 'items' && parts[1]) {
      const col = parts[1];
      db[col] ||= [];
      if (method === 'GET' && !parts[2]) {
        const filter = url.searchParams.get('filter');
        let rows = db[col].filter((r) => matches(r, filter ? JSON.parse(filter) : null));
        rows = sortRows(rows, url.searchParams.get('sort'));
        const limit = Number(url.searchParams.get('limit') ?? 100);
        if (limit >= 0) rows = rows.slice(0, limit);
        return json(200, { data: rows.map((r) => pickFields(r, url.searchParams.get('fields'))) });
      }
      if (method === 'POST' && !parts[2]) {
        if (failCreate.includes(col)) return json(403, { errors: [{ message: 'You don’t have permission to access this.' }] });
        const body = await request.json();
        ids[col] = (ids[col] || 0) + 1;
        const row = { id: ids[col], date_created: new Date().toISOString(), ...body };
        db[col].push(row);
        return json(200, { data: pickFields(row, url.searchParams.get('fields')) });
      }
      if (method === 'PATCH' && parts[2]) {
        const row = db[col].find((r) => String(r.id) === parts[2]);
        if (!row) return json(404, { errors: [{ message: 'Not found' }] });
        Object.assign(row, await request.json());
        return json(200, { data: row });
      }
    }

    if (parts[0] === 'files' && method === 'POST') {
      const form = await request.formData();
      const file = form.get('file');
      const id = randomUUID();
      files.set(id, { id, title: form.get('title'), type: file.type, name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
      return json(200, { data: { id } });
    }

    if (parts[0] === 'assets' && parts[1] && method === 'GET') {
      const file = files.get(parts[1]) || seed.__files?.find((f) => f.id === parts[1]);
      if (!file) return json(404, { errors: [{ message: 'Not found' }] });
      return new Response(file.bytes, { status: 200, headers: { 'Content-Type': file.type } });
    }

    return json(404, { errors: [{ message: `mock Directus: no route for ${method} ${url.pathname}` }] });
  }

  return { db, files, log, handle, rows: (col) => db[col] || [] };
}

/* ─────────────────────────── Stripe ─────────────────────────── */

/** Stripe Checkout and refunds; requests are form-encoded, as Stripe's are. */
export function createStripe() {
  const sessions = new Map();
  const refunds = [];
  const log = [];
  let n = 0;

  async function handle(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/v1/, '');
    const form = request.method === 'POST' ? new URLSearchParams(await request.text()) : null;
    log.push({ method: request.method, path, auth: request.headers.get('authorization'), idempotencyKey: request.headers.get('idempotency-key') });
    let m;

    if (path === '/checkout/sessions' && request.method === 'POST') {
      const lines = [];
      for (let i = 0; form.has(`line_items[${i}][quantity]`); i++) {
        const p = `line_items[${i}][price_data]`;
        lines.push({
          name: form.get(`${p}[product_data][name]`),
          currency: form.get(`${p}[currency]`),
          unit_amount: Number(form.get(`${p}[unit_amount]`)),
          quantity: Number(form.get(`line_items[${i}][quantity]`)),
        });
      }
      const id = `cs_test_T${++n}`;
      const session = {
        id,
        object: 'checkout.session',
        url: `https://checkout.stripe.test/pay/${id}`,
        status: 'open',
        payment_status: 'unpaid',
        amount_total: lines.reduce((s, l) => s + l.unit_amount * l.quantity, 0),
        currency: lines[0]?.currency ?? null,
        client_reference_id: form.get('client_reference_id'),
        customer_email: form.get('customer_email'),
        success_url: form.get('success_url'),
        cancel_url: form.get('cancel_url'),
        expires_at: Number(form.get('expires_at')),
        metadata: { order: form.get('metadata[order]'), kind: form.get('metadata[kind]') },
        payment_intent: null,
        lines,
      };
      sessions.set(id, session);
      return json(200, session);
    }
    if ((m = path.match(/^\/checkout\/sessions\/([^/]+)$/)) && request.method === 'GET') {
      const s = sessions.get(decodeURIComponent(m[1]));
      if (!s) return json(404, { error: { message: `No such checkout.session: '${m[1]}'` } });
      // ?expand[]=payment_intent turns the id into an object.
      const expand = url.searchParams.getAll('expand[]').includes('payment_intent');
      return json(200, { ...s, payment_intent: expand && s.payment_intent ? { id: s.payment_intent, object: 'payment_intent' } : s.payment_intent });
    }
    if (path === '/refunds' && request.method === 'POST') {
      const pi = form.get('payment_intent');
      const s = [...sessions.values()].find((x) => x.payment_intent === pi);
      if (!s || s.payment_status !== 'paid') return json(400, { error: { message: `No such payment_intent: '${pi}'` } });
      if (s.refunded) return json(400, { error: { message: `Charge for ${pi} has already been refunded.` } });
      const refund = { id: `re_T${refunds.length + 1}`, payment_intent: pi, amount: Number(form.get('amount')), status: 'succeeded', metadata: { order: form.get('metadata[order]') } };
      s.refunded = true;
      refunds.push(refund);
      return json(200, refund);
    }
    return json(404, { error: { message: `mock Stripe: no route for ${request.method} ${path}` } });
  }

  /** Simulate the customer finishing on Stripe's page. */
  function pay(sessionId, { status = 'complete', paymentStatus = 'paid', amount, currency } = {}) {
    const s = sessions.get(sessionId);
    s.status = status;
    s.payment_status = paymentStatus;
    if (amount != null) s.amount_total = amount;
    if (currency) s.currency = currency;
    if (paymentStatus === 'paid') s.payment_intent ||= `pi_T${sessionId.split('_T')[1]}`;
    return s;
  }

  const expire = (sessionId) => {
    sessions.get(sessionId).status = 'expired';
  };

  return { sessions, refunds, log, handle, pay, expire };
}

/** The Stripe-Signature header for a webhook body. */
export function stripeSignature(body, secret, timestamp = Math.floor(Date.now() / 1000)) {
  return `t=${timestamp},v1=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
}

/* ─────────────────────────── Qikink ─────────────────────────── */

export function createQikink({ createFails = false } = {}) {
  const orders = [];
  const log = [];
  let n = 5000;

  async function handle(request) {
    const url = new URL(request.url);
    log.push({ method: request.method, host: url.host, path: url.pathname });

    if (url.pathname === '/api/token' && request.method === 'POST') {
      const form = new URLSearchParams(await request.text());
      if (form.get('client_secret') !== 'qk-secret') return json(401, { message: 'Invalid client' });
      return json(200, { ClientId: form.get('ClientId'), Accesstoken: 'qk-token', expires_in: 3600 });
    }
    if (request.headers.get('accesstoken') !== 'qk-token') return json(401, { message: 'Unauthorized' });

    if (url.pathname === '/api/order/create' && request.method === 'POST') {
      if (createFails) return json(400, { error: 'Invalid SKU', status_code: '400' });
      const body = await request.json();
      const order = { order_id: ++n, number: body.order_number, status: 'Live', host: url.host, request: body, shipping: { awb: null, tracking_link: null, courier_provider_name: null } };
      orders.push(order);
      return json(200, { message: 'Order created successfully', order_id: order.order_id, status_code: '200' });
    }
    if (url.pathname === '/api/order/list') {
      const ref = url.searchParams.get('order_reference_no');
      return json(200, { success: true, data: orders.filter((o) => o.number === ref) });
    }
    return json(404, { message: `mock Qikink: no route for ${request.method} ${url.pathname}` });
  }

  /** Move an order on, as Qikink would. */
  function ship(number, { status = 'In-Transit', awb = 'QK123', courier = 'Delhivery', link = null } = {}) {
    const o = orders.find((x) => x.number === number);
    o.status = status;
    o.shipping = { awb, tracking_link: link, courier_provider_name: courier };
  }

  return { orders, log, handle, ship };
}

/* ─────────────────────────── Gelato ─────────────────────────── */

/** Methods offered per quote; prices in whatever currency was asked for. */
const METHODS = [
  { name: 'Standard', shipmentMethodUid: 'standard', price: 5, minDeliveryDays: 5, maxDeliveryDays: 8 },
  { name: 'Express', shipmentMethodUid: 'express', price: 15, minDeliveryDays: 2, maxDeliveryDays: 3 },
];

export function createGelato({ productPrice = 20, cancelFails = false, createFails = false } = {}) {
  const orders = new Map();
  const quotes = [];
  const log = [];
  let n = 0;

  async function handle(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    log.push({ method: request.method, host: url.host, path });
    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : null;
    let m;

    if (path === '/v4/orders:quote') {
      quotes.push(body);
      return json(200, {
        orderReferenceId: body.orderReferenceId,
        quotes: [
          {
            id: 'q1',
            itemReferenceIds: body.products.map((p) => p.itemReferenceId),
            fulfillmentCountry: body.recipient.country,
            shipmentMethods: METHODS.map((x) => ({ ...x, currency: body.currency })),
            products: body.products.map((p) => ({ ...p, price: productPrice })),
          },
        ],
      });
    }
    if (path === '/v4/orders' && request.method === 'POST') {
      if (createFails) return json(400, { message: 'Invalid print file: could not download https://site.test/front.png' });
      const order = {
        id: `gel-${++n}`,
        orderReferenceId: body.orderReferenceId,
        orderType: body.orderType,
        fulfillmentStatus: body.orderType === 'draft' ? 'draft' : 'created',
        request: body,
        shipment: { shipmentMethodName: 'Standard', packages: [] },
      };
      orders.set(order.id, order);
      return json(200, order);
    }
    if ((m = path.match(/^\/v4\/orders\/([^/:]+):cancel$/))) {
      if (cancelFails) return json(409, { message: 'Order is already in production and cannot be canceled' });
      const o = orders.get(m[1]);
      if (o) o.fulfillmentStatus = 'canceled';
      return json(200, {});
    }
    if ((m = path.match(/^\/v4\/orders\/([^/:]+)$/))) {
      const o = orders.get(m[1]);
      if (request.method === 'DELETE') {
        orders.delete(m[1]);
        return json(200, {});
      }
      return o ? json(200, o) : json(404, { message: 'Order not found' });
    }
    if ((m = path.match(/^\/v3\/products\/(.+)$/))) {
      return json(200, { productUid: decodeURIComponent(m[1]), attributes: { GarmentSize: 'M' } });
    }
    return json(404, { message: `mock Gelato: no route for ${request.method} ${path}` });
  }

  /** Move an order on, as Gelato would. */
  function ship(id, { status = 'shipped', trackingCode = 'TRACK123', trackingUrl = 'https://track.test/TRACK123' } = {}) {
    const o = orders.get(id);
    o.fulfillmentStatus = status;
    o.shippedAt = '2026-10-20T10:00:00Z';
    o.shipment.packages = trackingCode || trackingUrl ? [{ trackingCode, trackingUrl }] : [];
  }

  return { orders, quotes, log, handle, ship };
}

/* ─────────────────────────── email ─────────────────────────── */

export function createMail() {
  const sent = [];
  async function handle(request) {
    const url = new URL(request.url);
    if (url.host === 'login.microsoftonline.com') return json(200, { access_token: 'graph-token', expires_in: 3600 });
    const body = await request.json();
    // A designed (HTML) version and attachments are recorded only when a mail has them.
    const extras = (html, attachments) => ({ ...(html ? { html } : {}), ...(attachments?.length ? { attachments } : {}) });
    if (url.host === 'graph.microsoft.com') {
      const isHtml = body.message.body.contentType === 'HTML';
      sent.push({
        via: 'graph',
        from: decodeURIComponent(url.pathname.split('/')[3]),
        to: body.message.toRecipients[0].emailAddress.address,
        subject: body.message.subject,
        text: isHtml ? undefined : body.message.body.content,
        replyTo: body.message.replyTo?.[0]?.emailAddress.address,
        ...extras(
          isHtml ? body.message.body.content : null,
          body.message.attachments?.map((a) => ({ name: a.name, contentType: a.contentType, content: a.contentBytes })),
        ),
      });
      return new Response(null, { status: 202 });
    }
    sent.push({
      via: 'resend',
      to: body.to[0],
      subject: body.subject,
      text: body.text,
      replyTo: body.reply_to,
      ...extras(body.html, body.attachments?.map((a) => ({ name: a.filename, contentType: a.content_type, content: a.content }))),
    });
    return json(200, { id: 'email_1' });
  }
  return { sent, handle };
}

/* ─────────────────────────── routing ─────────────────────────── */

/**
 * Replace global fetch for the duration of a test. Anything not routed to a
 * stand-in fails loudly, so no test can reach the real internet by accident.
 */
export function installFetch({ directus, stripe, gelato, qikink, mail } = {}) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const headers = new Headers(init.headers || {});
    const request = new Request(url, { method: init.method || 'GET', headers, body: init.body ?? null, duplex: 'half' });
    const host = new URL(url).host;
    calls.push({ url, method: request.method });
    if (directus && url.startsWith(DIRECTUS_URL)) return directus.handle(request);
    if (stripe && host === 'api.stripe.com') return stripe.handle(request);
    if (gelato && host.endsWith('gelatoapis.com')) return gelato.handle(request);
    if (qikink && host.endsWith('qikink.com')) return qikink.handle(request);
    if (mail && ['login.microsoftonline.com', 'graph.microsoft.com', 'api.resend.com'].includes(host)) return mail.handle(request);
    throw new Error(`Unexpected network call in test: ${request.method} ${url}`);
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

/** A clean environment for each test: the app reads its config from process.env. */
export function setEnv(values) {
  const keys = [
    'DIRECTUS_URL', 'DIRECTUS_TOKEN', 'NEXT_PUBLIC_DIRECTUS_URL', 'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SHOP_OPEN',
    'NEXT_PUBLIC_SHOP_CURRENCY', 'GELATO_API_KEY', 'PAYMENT_GATEWAY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
    'QIKINK_CLIENT_ID', 'QIKINK_CLIENT_SECRET', 'QIKINK_BASE_URL', 'MS_TENANT_ID', 'MS_CLIENT_ID', 'MS_CLIENT_SECRET', 'MAIL_FROM', 'RESEND_API_KEY',
    'TEAM_NOTIFY_EMAIL', 'CRON_SECRET', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'SITE_INDEXABLE',
  ];
  for (const k of keys) delete process.env[k];
  // Like every real server, a test always has a site address (NEXT_PUBLIC_SITE_URL is required).
  Object.assign(process.env, { DIRECTUS_URL, DIRECTUS_TOKEN: 'site-token', NEXT_PUBLIC_SITE_URL: 'https://stage.antisocialtalks.com', ...values });
}

export const SHOP_ENV = {
  NEXT_PUBLIC_SHOP_OPEN: 'true',
  GELATO_API_KEY: 'gelato-test-key',
  NEXT_PUBLIC_SITE_URL: 'https://stage.antisocialtalks.com',
  PAYMENT_GATEWAY: 'stripe',
  STRIPE_SECRET_KEY: 'sk_test_abc',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  QIKINK_CLIENT_ID: 'qk-client',
  QIKINK_CLIENT_SECRET: 'qk-secret',
  QIKINK_BASE_URL: 'https://sandbox.qikink.com',
  MS_TENANT_ID: 'tenant',
  MS_CLIENT_ID: 'client',
  MS_CLIENT_SECRET: 'secret',
  MAIL_FROM: 'AntiSocialTalks <admin@antisocialtalks.com>',
  TEAM_NOTIFY_EMAIL: 'team@antisocialtalks.com',
};

/**
 * Collect console.error / console.warn instead of printing them: the failure
 * paths under test log on purpose. TEST_LOGS=1 prints them as well.
 */
export function captureConsole() {
  const lines = [];
  const original = { error: console.error, warn: console.warn };
  for (const level of ['error', 'warn']) {
    console[level] = (...args) => {
      lines.push(`${level}: ${args.map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`);
      if (process.env.TEST_LOGS) original[level](...args);
    };
  }
  return { lines, restore: () => Object.assign(console, original) };
}

/** POST helpers for calling route handlers directly. */
export const postJson = (path, body, headers = {}) =>
  new Request(`http://site.test${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

export const postForm = (path, fields) => {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return new Request(`http://site.test${path}`, { method: 'POST', body: form });
};
