#!/usr/bin/env node
/**
 * Clears test orders out of the Gelato account's order history.
 *
 *   node scripts/shop/gelato-clean-orders.mjs            list every order, change nothing
 *   node scripts/shop/gelato-clean-orders.mjs --delete   delete every DRAFT order
 *
 * Gelato only lets drafts be deleted. Real orders (anything that was sent to
 * print) stay in the history and are listed; cancel one in the Gelato
 * dashboard if it hasn't gone to production yet.
 *
 * Reads GELATO_API_KEY from the environment or web/.env.local, so on the
 * server it uses the server's key.
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

const KEY = process.env.GELATO_API_KEY;
const DELETE = process.argv.includes('--delete');
const API = 'https://order.gelatoapis.com/v4';
const H = { 'X-API-KEY': KEY, 'Content-Type': 'application/json' };

async function main() {
  if (!KEY) throw new Error('GELATO_API_KEY is not set.');
  console.log(`\n  Gelato account with key ${KEY.slice(0, 6)}…${KEY.slice(-4)}\n`);

  const orders = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const res = await fetch(`${API}/orders:search`, { method: 'POST', headers: H, body: JSON.stringify({ limit: 100, offset }) });
    const body = await res.json();
    if (!res.ok) throw new Error(`Gelato ${res.status}: ${body?.message || res.statusText}`);
    orders.push(...(body.orders || []));
    if ((body.orders || []).length < 100) break;
  }

  if (!orders.length) {
    console.log('  No orders in this account.\n');
    return;
  }

  const drafts = orders.filter((o) => o.orderType === 'draft' || o.fulfillmentStatus === 'draft');
  const real = orders.filter((o) => !drafts.includes(o));
  console.log(`  ${orders.length} order(s): ${drafts.length} draft, ${real.length} real\n`);

  for (const o of drafts) {
    if (!DELETE) {
      console.log(`  · draft ${o.id}  ${o.orderReferenceId}  ${(o.createdAt || '').slice(0, 10)}`);
      continue;
    }
    const res = await fetch(`${API}/orders/${o.id}`, { method: 'DELETE', headers: H });
    console.log(`  ${res.ok ? '- deleted' : `x could not delete (${res.status})`} draft ${o.id}  ${o.orderReferenceId}`);
  }

  for (const o of real) {
    console.log(`  ! real order ${o.id}  ${o.orderReferenceId}  ${o.fulfillmentStatus}  (cannot be deleted; cancel it in the dashboard if needed)`);
  }

  if (!DELETE && drafts.length) console.log('\n  Run again with --delete to remove the drafts.');
  console.log('');
}

main().catch((err) => {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exitCode = 1;
});
