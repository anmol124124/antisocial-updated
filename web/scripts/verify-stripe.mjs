#!/usr/bin/env node
/**
 * Checks the site's Stripe settings from the server itself: reads .env.local
 * the way the site does, then asks Stripe (read-only) about the account and
 * the webhook. Nothing is charged or changed, and no key is printed.
 *
 *   node scripts/verify-stripe.mjs
 *
 * Run it in the site's folder (where .env.local is).
 */

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const env = process.env;
const problems = [];
const ok = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => {
  console.log(`  x ${msg}`);
  problems.push(msg);
};

const site = (env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
const production = /^https:\/\/(www\.)?antisocialtalks\.com$/.test(site);
const key = env.STRIPE_SECRET_KEY?.trim() || '';
const mode = key.includes('_live_') ? 'live' : key.includes('_test_') ? 'test' : null;

console.log(`\n  Stripe settings in ${process.cwd()}/.env.local\n`);
console.log(`  site               ${site || '(NEXT_PUBLIC_SITE_URL empty)'}`);
console.log(`  shop               ${env.NEXT_PUBLIC_SHOP_OPEN === 'true' ? 'open' : 'Coming Soon'} (NEXT_PUBLIC_SHOP_OPEN; a change needs npm run build)`);
console.log('');

if (env.PAYMENT_GATEWAY === 'stripe') ok('PAYMENT_GATEWAY=stripe');
else warn(`PAYMENT_GATEWAY is "${env.PAYMENT_GATEWAY || ''}": set it to stripe, or checkout and paid bookings stay closed`);

if (!key) warn('STRIPE_SECRET_KEY is empty');
else if (!/^(sk|rk)_(test|live)_/.test(key)) warn('STRIPE_SECRET_KEY does not look like a Stripe secret key (sk_test_… / sk_live_…)');
else ok(`STRIPE_SECRET_KEY is a ${mode} key${key.startsWith('rk_') ? ' (restricted)' : ''}`);
if (mode === 'live' && !production) warn('a LIVE key on a site that is not antisocialtalks.com: staging should use sk_test_');
if (mode === 'test' && production) console.log('  ! a TEST key on the live site: payments are not real (fine while testing)');

if (/^whsec_/.test(env.STRIPE_WEBHOOK_SECRET || '')) ok('STRIPE_WEBHOOK_SECRET is set');
else warn('STRIPE_WEBHOOK_SECRET is empty or not a whsec_… value');

if ((env.CRON_SECRET || '').length >= 32) ok('CRON_SECRET is set');
else warn('CRON_SECRET is missing or short (make one with: openssl rand -hex 32)');

try {
  const lines = execSync('crontab -l', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n');
  const job = lines.filter((l) => l.includes('/api/cron/orders') && !l.trim().startsWith('#'));
  const mine = job.filter((l) => l.includes(process.cwd()));
  if (mine.length) ok('crontab runs the order job for this site');
  else warn(`no crontab line for this site's order job (found ${job.length} for other folders)`);
} catch {
  warn('no crontab for this user: the order job (refunds, shipping emails, missed payments) never runs');
}

async function stripe(path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, { headers: { Authorization: `Bearer ${key}` } });
  const body = await res.json().catch(() => ({}));
  // Stripe's own message shows the key's last characters; leave the key out entirely.
  if (!res.ok) throw new Error((body?.error?.message || `HTTP ${res.status}`).replace(/\b(sk|rk)_(test|live)_\S+/g, '(your key)'));
  return body;
}

if (key) {
  console.log('');
  try {
    const a = await stripe('/account');
    ok(`Stripe account ${a.business_profile?.name || a.settings?.dashboard?.display_name || a.id} (${a.country}, payouts in ${(a.default_currency || '').toUpperCase()})`);
    if (mode === 'live') {
      if (a.charges_enabled) ok('can take payments (charges enabled)');
      else warn('Stripe cannot take live payments yet: finish activating the account in the Dashboard');
      if (a.payouts_enabled) ok('payouts to the bank are enabled');
      else console.log('  ! payouts are not enabled yet (add or verify the bank account)');
    }
    const descriptor = a.settings?.payments?.statement_descriptor;
    console.log(`  · card statement shows "${descriptor || '(not set)'}"`);
  } catch (err) {
    warn(`Stripe refused the key: ${err.message}`);
  }

  try {
    const { data } = await stripe('/webhook_endpoints?limit=100');
    const url = `${site}/api/webhooks/payment`;
    const hook = data.find((h) => h.url.replace(/\/$/, '') === url);
    if (!hook) {
      warn(`no ${mode || ''} webhook for ${url} (Developers → Webhooks → Add endpoint)`);
      if (data.length) console.log(`    webhooks there: ${data.map((h) => h.url).join(', ')}`);
    } else {
      const events = hook.enabled_events || [];
      const missing = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].filter((e) => !events.includes(e) && !events.includes('*'));
      if (hook.status !== 'enabled') warn(`the webhook for ${url} is ${hook.status}`);
      else if (missing.length) warn(`the webhook is missing the event(s): ${missing.join(', ')}`);
      else ok(`webhook ${url} sends both checkout events`);
    }
  } catch (err) {
    warn(`could not list webhooks: ${err.message}`);
  }
}

console.log(
  problems.length
    ? `\n  ${problems.length} thing(s) to fix above. Restart the site (pm2 restart …) after changing .env.local.\n`
    : '\n  All set. Restart the site (pm2 restart …) if you changed .env.local, then make a test payment.\n',
);
process.exit(problems.length ? 1 : 0);
