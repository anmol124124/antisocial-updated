#!/usr/bin/env node
/**
 * The whole shop, checked from the server before it takes orders: settings,
 * Stripe, Gelato, Qikink, email, the order job, every product in the CMS
 * (prices, sizes, colours, photos, print files, Gelato products, Qikink SKUs)
 * and the orders already recorded.
 *
 * Read-only: nothing is ordered, charged, emailed or changed, and no key or
 * customer detail is printed.
 *
 *   node scripts/verify/verify-shop.mjs            settings, products and orders
 *   node scripts/verify/verify-shop.mjs --quotes   also asks this site for delivery to
 *                                           every market for every product, the
 *                                           way checkout does (the shop must be
 *                                           open on this site; nothing is ordered)
 *   --port 3012                             the site's port, when not the usual one
 *
 * Run it in the site's folder (where .env.local is) while the site is running.
 */

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const env = process.env;
const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const QUOTES = args.includes('--quotes');

const problems = [];
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => {
  console.log(`  x ${msg}`);
  problems.push(msg);
};
const note = (msg) => console.log(`  ! ${msg}`);
const info = (msg) => console.log(`      ${msg}`);
const heading = (title) => console.log(`\n  ${title}\n  ${'─'.repeat(title.length)}`);

/** Error text without anything that looks like a key. */
const clean = (s) => String(s).replace(/\b(sk|rk|pk)_(test|live)_\S+|whsec_\S+/g, '(key)').slice(0, 200);
const errText = (err) => clean(err?.cause?.code || err?.message || err);

/** Run `fn` over `items`, `limit` at a time, keeping the order. */
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

const site = (env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
const live = /^https:\/\/(www\.)?antisocialtalks\.com$/.test(site);
const port = Number(flag('--port')) || (live ? 3021 : /\/\/stage\./.test(site) ? 3012 : 3000);
const local = `http://127.0.0.1:${port}`;
const stripeKey = (env.STRIPE_SECRET_KEY || '').trim();
const stripeMode = stripeKey.includes('_live_') ? 'live' : stripeKey.includes('_test_') ? 'test' : null;

console.log(`\n  Shop check for ${site || '(NEXT_PUBLIC_SITE_URL is empty)'}  (${process.cwd()}, port ${port})`);

/* ─────────────────────────────── settings ─────────────────────────────── */

heading('Settings');

const envOpen = env.NEXT_PUBLIC_SHOP_OPEN !== 'false';
let siteOpen = null;
try {
  // An empty body: 400 when checkout is open, 501 when the running build has the shop closed.
  const res = await fetch(`${local}/api/gelato/quote`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20_000) });
  siteOpen = res.status !== 501;
} catch (err) {
  bad(`the site does not answer on ${local} (${errText(err)}): is it running? Use --port if it is on another port`);
}
if (siteOpen !== null) {
  const word = (open) => (open ? 'open' : 'Coming Soon');
  if (siteOpen === envOpen) ok(`shop is ${word(siteOpen)} (NEXT_PUBLIC_SHOP_OPEN, and the running build agrees)`);
  else bad(`.env.local says the shop is ${word(envOpen)} but the running build is ${word(siteOpen)}: run npm run build and pm2 restart`);
}

if (env.PAYMENT_GATEWAY === 'stripe') ok('PAYMENT_GATEWAY=stripe');
else bad(`PAYMENT_GATEWAY is "${env.PAYMENT_GATEWAY || ''}": checkout stays closed until it is stripe`);

if (!stripeKey) bad('STRIPE_SECRET_KEY is empty');
else if (!/^(sk|rk)_(test|live)_/.test(stripeKey)) bad('STRIPE_SECRET_KEY does not look like a Stripe secret key');
else ok(`STRIPE_SECRET_KEY is a ${stripeMode} key${stripeMode === 'test' ? ' (nothing is really charged)' : ' (REAL payments)'}`);
if (stripeMode === 'live' && !live) bad('a LIVE Stripe key on a site that is not antisocialtalks.com');
if (stripeMode === 'test' && live) note('a TEST Stripe key on the live site: fine for a trial, but customers cannot really pay');

if (/^whsec_/.test(env.STRIPE_WEBHOOK_SECRET || '')) ok('STRIPE_WEBHOOK_SECRET is set');
else bad('STRIPE_WEBHOOK_SECRET is empty: payments made by visitors who close the tab are only caught by the order job');

if ((env.CRON_SECRET || '').length >= 32) ok('CRON_SECRET is set');
else bad('CRON_SECRET is missing or short (openssl rand -hex 32): the order job is refused');

try {
  const lines = execSync('crontab -l', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .split('\n')
    .filter((l) => l.includes('/api/cron/orders') && !l.trim().startsWith('#'));
  const mine = lines.filter((l) => l.includes(process.cwd()));
  if (!mine.length) bad(`no crontab line runs the order job for ${process.cwd()} (shipping emails, refunds and missed payments never happen)`);
  else if (!mine.some((l) => l.includes(`:${port}/api/cron/orders`))) bad(`the crontab line for this folder does not call port ${port}`);
  else ok(`crontab runs the order job on port ${port} (${mine[0].trim().split(/\s+/).slice(0, 5).join(' ')})`);
} catch {
  bad('no crontab for this user: the order job never runs');
}
try {
  const res = await fetch(`${local}/api/cron/orders`, { method: 'POST', signal: AbortSignal.timeout(20_000) });
  if (res.status === 401) ok('the order job refuses calls without the secret');
  else bad(`the order job answered ${res.status} to a call without the secret (expected 401)`);
} catch {
  /* the site not answering is reported above */
}

const mailVia =
  !env.MAIL_FROM ? null
  : env.MS_TENANT_ID && env.MS_CLIENT_ID && env.MS_CLIENT_SECRET ? 'Microsoft 365'
  : env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD ? `SMTP (${env.SMTP_HOST})`
  : env.RESEND_API_KEY ? 'Resend'
  : null;
if (mailVia) ok(`email goes out through ${mailVia} as ${env.MAIL_FROM}`);
else bad('no email provider (MAIL_FROM plus SMTP_* / MS_* / RESEND_API_KEY): customers get no order or shipping emails');
if (env.TEAM_NOTIFY_EMAIL) ok(`the team is told about orders at ${env.TEAM_NOTIFY_EMAIL}`);
else bad('TEAM_NOTIFY_EMAIL is empty: nobody hears about paid orders or failed print orders');
if (mailVia) note('to test sending for real: node scripts/verify/verify-mail.mjs --to=you@example.com');

/* ──────────────────────────────── Stripe ──────────────────────────────── */

heading('Stripe');

async function stripe(path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, { headers: { Authorization: `Bearer ${stripeKey}` }, signal: AbortSignal.timeout(20_000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message || `HTTP ${res.status}`);
  return body;
}

if (!stripeKey) {
  note('skipped: no key');
} else {
  try {
    const a = await stripe('/account');
    ok(`account ${a.business_profile?.name || a.settings?.dashboard?.display_name || a.id} (${a.country}, settles in ${(a.default_currency || '').toUpperCase()})`);
    if (stripeMode === 'live') {
      if (a.charges_enabled) ok('can take live payments');
      else bad('Stripe cannot take live payments yet: finish activating the account');
      if (a.payouts_enabled) ok('payouts to the bank are on');
      else note('payouts are not on yet (bank account)');
    }
    info(`card statements show "${a.settings?.payments?.statement_descriptor || '(not set)'}"`);
  } catch (err) {
    bad(`Stripe refused the key: ${errText(err)}`);
  }
  try {
    const { data } = await stripe('/webhook_endpoints?limit=100');
    const url = `${site}/api/webhooks/payment`;
    const hook = data.find((h) => h.url.replace(/\/$/, '') === url);
    const needed = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
    if (!hook) bad(`no ${stripeMode} webhook for ${url}${data.length ? ` (there are: ${data.map((h) => h.url).join(', ')})` : ''}`);
    else if (hook.status !== 'enabled') bad(`the webhook for ${url} is ${hook.status}`);
    else if (needed.some((e) => !hook.enabled_events.includes(e) && !hook.enabled_events.includes('*'))) bad('the webhook lacks checkout.session.completed or checkout.session.async_payment_succeeded');
    else ok(`webhook ${url} gets both checkout events`);
  } catch (err) {
    bad(`could not list Stripe webhooks: ${errText(err)}`);
  }
  // Signed like Stripe would, with an old timestamp: the site must refuse it.
  try {
    const res = await fetch(`${local}/api/webhooks/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 't=1,v1=00' },
      body: '{}',
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 400) ok('the site refuses webhook calls without a valid signature');
    else if (res.status === 501) bad('the payment webhook says no gateway is configured');
    else bad(`the payment webhook answered ${res.status} to a forged call (expected 400)`);
  } catch {
    /* reported above */
  }
}

/* ─────────────────────────────── printers ─────────────────────────────── */

heading('Printers');

const GELATO_KEY = env.GELATO_API_KEY || '';
const gelatoReady = GELATO_KEY && !/REPLACE_WITH|your-gelato/i.test(GELATO_KEY);
async function gelato(url) {
  const res = await fetch(url, { headers: { 'X-API-KEY': GELATO_KEY }, signal: AbortSignal.timeout(30_000) });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}
if (!gelatoReady) {
  bad('GELATO_API_KEY is not set: orders outside India cannot be quoted or printed');
} else {
  try {
    const r = await gelato('https://product.gelatoapis.com/v3/catalogs');
    const catalogues = Array.isArray(r.body) ? r.body : Array.isArray(r.body?.data) ? r.body.data : null;
    if (r.status === 200) ok(`Gelato key works${catalogues ? ` (${catalogues.length} catalogues)` : ''}`);
    else bad(`Gelato refused the key (HTTP ${r.status})`);
  } catch (err) {
    bad(`Gelato did not answer: ${errText(err)}`);
  }
  note('Gelato webhook (shipping updates sooner): Gelato dashboard → Developer → Webhooks → ' + `${site}/api/webhooks/gelato` + ' (the order job checks anyway)');
}

const qikinkBase = (env.QIKINK_BASE_URL || 'https://api.qikink.com').replace(/\/$/, '');
const qikinkSandbox = qikinkBase.includes('sandbox');
if (!env.QIKINK_CLIENT_ID || !env.QIKINK_CLIENT_SECRET) {
  bad('QIKINK_CLIENT_ID / QIKINK_CLIENT_SECRET are not set: paid India orders cannot be sent to Qikink');
} else {
  if (stripeMode === 'live' && qikinkSandbox) bad('real payments but QIKINK_BASE_URL is the SANDBOX: paid India orders would never be printed');
  else if (stripeMode === 'test' && !qikinkSandbox) note('test payments + Qikink live account: test India orders are NOT sent to Qikink (by design)');
  else ok(`Qikink ${qikinkSandbox ? 'sandbox' : 'live account'} (${qikinkBase})`);
  try {
    const res = await fetch(`${qikinkBase}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ClientId: env.QIKINK_CLIENT_ID, client_secret: env.QIKINK_CLIENT_SECRET }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.Accesstoken) ok('Qikink sign-in works');
    else bad(`Qikink refused the sign-in (HTTP ${res.status}): check the client id and secret for ${qikinkSandbox ? 'the sandbox' : 'the live account'}`);
  } catch (err) {
    bad(`Qikink did not answer: ${errText(err)}`);
  }
  note('Qikink has no product lookup: SKUs below are only proven by an order (sandbox, or one real order)');
}

/* ────────────────────────────────── CMS ────────────────────────────────── */

heading('CMS');

const CMS = (env.DIRECTUS_URL || env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/$/, '');
async function cms(path) {
  const res = await fetch(`${CMS}${path}`, { headers: { Authorization: `Bearer ${env.DIRECTUS_TOKEN || ''}` }, signal: AbortSignal.timeout(30_000) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.errors?.[0]?.message || `HTTP ${res.status}`);
  return body?.data;
}

let products = [];
let orders = null;
if (!CMS || !env.DIRECTUS_TOKEN) {
  bad('DIRECTUS_URL or DIRECTUS_TOKEN is empty');
} else {
  try {
    products = await cms(`/items/shop_products?${new URLSearchParams({ filter: JSON.stringify({ status: { _eq: 'published' } }), fields: '*', sort: 'sort,id', limit: '60' })}`);
    ok(`${products.length} published products`);
    if (products.length === 60) note('60 products: the site lists at most 60 (getShopProducts limit)');
  } catch (err) {
    bad(`the site token cannot read shop_products: ${errText(err)}`);
  }
  try {
    orders = await cms(`/items/orders?${new URLSearchParams({
      fields: 'id,kind,status,livemode,amount,currency,date_created,fulfilment_provider,gelato_order_id,qikink_order_id,stripe_payment_intent,shipped_notified',
      sort: '-date_created',
      limit: '2000',
    })}`);
    ok(`the site token can read orders (${orders.length} recorded)`);
  } catch (err) {
    bad(`the site token cannot read orders: ${errText(err)} (payments could never be confirmed)`);
  }
  try {
    const perms = await cms('/permissions/me');
    const can = (action) => {
      if (perms && !Array.isArray(perms) && perms.orders) return (perms.orders[action]?.access || 'none') !== 'none';
      if (Array.isArray(perms)) return perms.some((p) => p.collection === 'orders' && p.action === action);
      return null;
    };
    const missing = ['create', 'update'].filter((a) => can(a) === false);
    if (can('create') === null) note('could not read the token’s permissions; the first test order shows whether it can write orders');
    else if (missing.length) bad(`the site token cannot ${missing.join(' or ')} orders: checkout would fail`);
    else ok('the site token can create and update orders');
  } catch {
    note('could not read the token’s permissions; the first test order shows whether it can write orders');
  }
}

/* ─────────────────────────────── products ─────────────────────────────── */

heading('Products');

const colorwayOf = (p, color) => (color && p.colorways && typeof p.colorways === 'object' ? p.colorways[color] : null) || null;
function printFilesOf(p) {
  const map = p.print_files && typeof p.print_files === 'object' ? p.print_files : {};
  const files = Object.entries(map).filter(([, url]) => typeof url === 'string' && url).map(([type, url]) => ({ type, url }));
  return files.length ? files : p.print_file_url ? [{ type: 'default', url: p.print_file_url }] : [];
}
function printFilesFor(p, color) {
  const own = colorwayOf(p, color)?.print_files;
  return own && Object.values(own).some(Boolean) ? printFilesOf({ print_files: own }) : printFilesOf(p);
}
function photoFor(p, color) {
  const cw = colorwayOf(p, color);
  if (cw?.photo || cw?.mockup || (Array.isArray(cw?.gallery) && cw.gallery.length)) return cw.photo || cw.mockup || null;
  return p.photo || p.mockup || null;
}
const PLACEMENT = { front: 'fr', default: 'fr', back: 'bk' };
/** The Qikink SKU for one size/colour, the way lib/cart-pricing works it out; null = not sold in India. */
function qikinkSku(p, v) {
  const c = p.qikink;
  if (!c?.sku_template) return null;
  if (v?.markets?.length && !v.markets.includes('IN')) return null;
  const size = v?.size ?? null;
  if (size && Array.isArray(c.sizes) && c.sizes.length && !c.sizes.includes(size)) return null;
  const color = v?.color ?? null;
  const first = (Array.isArray(p.variants) ? p.variants : []).find((x) => x.color)?.color ?? null;
  const code = c.color_codes ? (color ? c.color_codes[color] : null) : !color || color === first ? '' : null;
  if (code == null) return null;
  const placed = printFilesFor(p, color).filter((f) => PLACEMENT[f.type] && c.designs?.[PLACEMENT[f.type]]);
  if (!placed.length) return null;
  const sizeCode = size ? c.size_codes?.[size] ?? size : '';
  return ((color && c.sku_templates?.[color]) || c.sku_template).replace('{color}', code).replace('{size}', sizeCode);
}

const fileChecks = new Map(); // url -> promise of what is wrong with it, or ''
function checkFile(url) {
  if (!fileChecks.has(url)) {
    fileChecks.set(
      url,
      (async () => {
        if (!/^https:\/\//.test(url)) return 'is not a public https address';
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
          const type = res.headers.get('content-type') || '';
          await res.body?.cancel().catch(() => {});
          if (res.status !== 200) return `answers ${res.status}`;
          if (!type.startsWith('image/')) return `is not an image (${type || 'no type'})`;
          return '';
        } catch (err) {
          return `cannot be fetched (${errText(err)})`;
        }
      })(),
    );
  }
  return fileChecks.get(url);
}
const gelatoChecks = new Map();
function checkGelatoUid(uid) {
  if (!gelatoChecks.has(uid)) {
    gelatoChecks.set(
      uid,
      gelato(`https://product.gelatoapis.com/v3/products/${encodeURIComponent(uid)}`)
        .then((r) => (r.status === 200 ? '' : `Gelato does not know the product ${uid} (HTTP ${r.status})`))
        .catch((err) => `Gelato product ${uid} could not be checked (${errText(err)})`),
    );
  }
  return gelatoChecks.get(uid);
}

const priced = (p, cur) => {
  const v = p.prices?.[cur];
  if (v != null && Number(v) > 0) return Number(v);
  return p.price != null && (p.currency || '').toUpperCase() === cur && Number(p.price) > 0 ? Number(p.price) : null;
};

for (const p of products) {
  const slug = p.slug || p.title;
  const variants = Array.isArray(p.variants) && p.variants.length ? p.variants : [{ uid: p.gelato_product_uid, size: null, color: null }];
  const colours = [...new Set(variants.map((v) => v.color || null))];
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const usd = priced(p, 'USD');
  const inr = priced(p, 'INR');
  const skus = [...new Set(variants.map((v) => qikinkSku(p, v)).filter(Boolean))];
  const own = [];

  console.log(`\n  ${p.title}  (/shop/${slug})`);
  info(`price ${usd != null ? `USD ${usd}` : 'no USD'} · ${inr != null ? `INR ${inr}` : 'no INR'} · ${colours.filter(Boolean).join(', ') || 'one colour'} · ${sizes.join(' ') || 'one size'}`);
  if (usd == null && inr == null) own.push('no price at all: cannot be bought anywhere');
  if (inr == null && skus.length) note(`${p.title}: has a Qikink setup but no INR price, so it is not sold in India`);
  if (inr != null && !skus.length) note(`${p.title}: has an INR price but no size/colour Qikink makes, so it is not sold in India`);

  for (const v of variants) if (!v.uid) own.push(`a variant (${[v.color, v.size].filter(Boolean).join(' / ')}) has no Gelato product UID`);

  // Each file once, with every colour that uses it.
  const files = new Map(); // url -> labels
  const use = (url, label) => files.set(url, [...(files.get(url) || []), label]);
  for (const color of colours) {
    const label = color || 'product';
    const photo = photoFor(p, color);
    if (!photo) own.push(`${label}: no photo or mockup`);
    else use(`${site}/api/assets/${photo}`, `${label} photo`);
    const prints = printFilesFor(p, color);
    if (!prints.length) own.push(`${label}: no print file`);
    for (const f of prints) use(f.url, `${label} ${f.type} print`);
  }
  const gelatoUids = usd == null ? [] : [...new Set(variants.map((v) => v.uid).filter((u) => u && !u.startsWith('in:')))];
  const jobs = [
    ...[...files].map(([url, labels]) => () => checkFile(url).then((why) => (why ? `${labels.join(', ')} ${why}: ${url}` : ''))),
    ...(gelatoReady ? gelatoUids.map((uid) => () => checkGelatoUid(uid)) : []),
  ];
  const found = (await pool(jobs, 6, (job) => job())).filter(Boolean);

  info(`India (Qikink): ${skus.length ? skus.join(', ') : 'not sold in India'}`);
  info(`Outside India (Gelato): ${usd == null ? 'not sold outside India' : `${gelatoUids.length} product UID(s)`}`);

  const all = [...own, ...found];
  if (!all.length) ok('prices, photos, print files and printer products all check out');
  for (const msg of all) bad(`${p.title}: ${msg}`);
}

/* ──────────────────────────────── quotes ──────────────────────────────── */

const ADDRESSES = {
  IN: { firstName: 'Test', lastName: 'Order', addressLine1: '1 MG Road', city: 'Bengaluru', state: 'KA', postCode: '560001', country: 'IN', email: 'test@example.com', phone: '+919999999999' },
  US: { firstName: 'Test', lastName: 'Order', addressLine1: '350 5th Ave', city: 'New York', state: 'NY', postCode: '10118', country: 'US', email: 'test@example.com', phone: '+12125550100' },
  CA: { firstName: 'Test', lastName: 'Order', addressLine1: '290 Bremner Blvd', city: 'Toronto', state: 'ON', postCode: 'M5V 3L9', country: 'CA', email: 'test@example.com', phone: '+14165550100' },
  GB: { firstName: 'Test', lastName: 'Order', addressLine1: '10 Downing St', city: 'London', postCode: 'SW1A 2AA', country: 'GB', email: 'test@example.com', phone: '+442071234567' },
  AE: { firstName: 'Test', lastName: 'Order', addressLine1: 'Sheikh Zayed Road 1', city: 'Dubai', state: 'Dubai', postCode: '00000', country: 'AE', email: 'test@example.com', phone: '+971500000000' },
};

if (QUOTES) {
  heading('Delivery quotes (the way checkout asks)');
  if (siteOpen === false) {
    bad('the shop is closed on this site, so it gives no quotes: run --quotes on staging, or after opening the shop');
  } else if (siteOpen) {
    const jobs = [];
    for (const p of products) {
      const variants = Array.isArray(p.variants) && p.variants.length ? p.variants : [{ uid: p.gelato_product_uid }];
      // One size per market: M of the first colour where there is one.
      const order = [...variants].sort((a, b) => (b.size === 'M') - (a.size === 'M'));
      for (const market of Object.keys(ADDRESSES)) {
        const v = order.find((x) => (market === 'IN' ? qikinkSku(p, x) : !x.uid?.startsWith('in:') && (!x.markets?.length || x.markets.includes(market))));
        const sellsHere = market === 'IN' ? priced(p, 'INR') != null : priced(p, 'USD') != null;
        if (!v || !sellsHere) {
          jobs.push(async () => ({ p, market, skipped: true }));
          continue;
        }
        jobs.push(async () => {
          try {
            const res = await fetch(`${local}/api/gelato/quote`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: [{ slug: p.slug, gelatoProductUid: v.uid, quantity: 1 }], shippingAddress: ADDRESSES[market] }),
              signal: AbortSignal.timeout(60_000),
            });
            const body = await res.json().catch(() => ({}));
            return { p, market, v, status: res.status, body };
          } catch (err) {
            return { p, market, v, status: 0, body: { error: errText(err) } };
          }
        });
      }
    }
    const results = await pool(jobs, 4, (job) => job());
    for (const p of products) {
      const mine = results.filter((r) => r.p === p);
      const parts = mine.map((r) => {
        if (r.skipped) return `${r.market} —`;
        const cheapest = (r.body.shipmentMethods || []).reduce((a, b) => (a == null || b.price < a.price ? b : a), null);
        if (r.status === 200 && cheapest) return `${r.market} ${r.body.currency} ${cheapest.price} (${cheapest.minDeliveryDays ?? '?'}-${cheapest.maxDeliveryDays ?? '?'} d)`;
        return `${r.market} FAILED`;
      });
      console.log(`  ${mine.some((r) => !r.skipped && !(r.status === 200 && r.body.shipmentMethods?.length)) ? 'x' : '✓'} ${p.title}: ${parts.join(' · ')}`);
      for (const r of mine) {
        if (r.skipped || (r.status === 200 && r.body.shipmentMethods?.length)) continue;
        const why = r.body.error || (r.status === 200 ? 'no delivery options' : `HTTP ${r.status}`);
        problems.push(`${p.title} to ${r.market}: ${why}`);
        info(`${r.market} (${[r.v.color, r.v.size].filter(Boolean).join(' / ')}): ${clean(why)}`);
      }
    }
    info('— = not sold there. Prices are delivery only, in the currency the customer pays.');
  }
}

/* ──────────────────────────────── orders ──────────────────────────────── */

heading('Orders in the CMS');

if (orders) {
  const mode = (o) => (o.livemode ? 'live' : 'test');
  for (const m of ['test', 'live']) {
    const list = orders.filter((o) => mode(o) === m);
    if (!list.length) {
      info(`${m}: none`);
      continue;
    }
    const by = {};
    for (const o of list) by[`${o.kind}:${o.status}`] = (by[`${o.kind}:${o.status}`] || 0) + 1;
    info(`${m}: ${list.length} — ${Object.entries(by).map(([k, n]) => `${n} ${k}`).join(', ')}`);
  }
  const mine = orders.filter((o) => (stripeMode === 'live') === Boolean(o.livemode));
  const age = (o) => Date.now() - new Date(o.date_created).getTime();
  const stuckPaid = mine.filter((o) => o.status === 'paid' && age(o) > 15 * 60_000);
  const failed = mine.filter((o) => ['fulfilment_failed', 'refund_failed', 'cancel_failed'].includes(o.status));
  const oldPending = mine.filter((o) => o.status === 'pending' && age(o) > 3 * 3600_000);
  const sentNoId = mine.filter((o) => o.status === 'fulfilled' && !o.gelato_order_id && !o.qikink_order_id && stripeMode === 'live');
  const say = stripeMode === 'live' ? bad : note;
  if (stuckPaid.length) say(`paid but never sent to a printer: ${stuckPaid.map((o) => `#${o.id}`).join(', ')}`);
  if (failed.length) say(`need a person (${[...new Set(failed.map((o) => o.status))].join(', ')}): ${failed.map((o) => `#${o.id}`).join(', ')}`);
  if (oldPending.length) note(`checkouts still "pending" after 3 hours (the order job closes them; is cron running?): ${oldPending.map((o) => `#${o.id}`).join(', ')}`);
  if (sentNoId.length) bad(`marked sent to a printer without a printer order id: ${sentNoId.map((o) => `#${o.id}`).join(', ')}`);
  const recent = mine.filter((o) => o.kind === 'shop').slice(0, 6);
  const which = stripeMode === 'live' ? 'live' : 'test';
  if (recent.length) {
    info(`latest ${which} shop orders:`);
    for (const o of recent) {
      const printer = o.fulfilment_provider || '?';
      const printerId = o.gelato_order_id || o.qikink_order_id ? `${printer} order ✓` : `${printer} order none`;
      info(`  #${o.id}  ${String(o.date_created).slice(0, 16).replace('T', ' ')}  ${o.status.padEnd(17)} ${o.currency} ${o.amount}  ${printerId}${o.shipped_notified ? ' · shipping email sent' : ''}`);
    }
  } else {
    note(`no ${which} shop orders yet: place a test order to prove the whole path`);
  }
}

/* ──────────────────────────────── summary ──────────────────────────────── */

console.log(
  problems.length
    ? `\n  ${problems.length} problem(s) above (lines with x).\n`
    : '\n  No problems found. Next: a test order through the site, then check the CMS order, the printer and both emails.\n',
);
process.exit(problems.length ? 1 : 0);
