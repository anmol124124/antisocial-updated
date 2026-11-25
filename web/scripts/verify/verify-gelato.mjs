#!/usr/bin/env node
/**
 * Confirms the Gelato API key in web/.env.local actually works, before you
 * discover otherwise at checkout.
 *
 *   npm run verify:gelato
 *
 * It only reads: lists the catalogs, then pulls one catalog's products. No
 * order — draft or otherwise — is created.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WEB_DIR } from '../lib/paths.mjs';


/** Minimal .env reader — avoids a dependency just for this script. */
function loadEnv(file) {
  try {
    const text = readFileSync(resolve(WEB_DIR, file), 'utf8');
    for (const line of text.split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  } catch {
    /* file may not exist; that is handled below */
  }
}

loadEnv('.env.local');
loadEnv('.env');

const KEY = process.env.GELATO_API_KEY;
const PLACEHOLDER = 'REPLACE_WITH_YOUR_GELATO_API_KEY';

if (!KEY || KEY === PLACEHOLDER || KEY === 'your-gelato-api-key') {
  console.error('\n  GELATO_API_KEY is still a placeholder.\n');
  console.error('  1. Open https://dashboard.gelato.com -> Store -> API keys');
  console.error('  2. Put the key in web/.env.local as GELATO_API_KEY=...');
  console.error('  3. Run this again.\n');
  process.exit(1);
}

const masked = `${KEY.slice(0, 6)}...${KEY.slice(-4)}`;
console.log(`\n  Checking Gelato key ${masked}\n`);

async function get(url) {
  const res = await fetch(url, { headers: { 'X-API-KEY': KEY } });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = body?.message || body?.error || res.statusText;
    const err = new Error(`${res.status} ${message}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

try {
  const catalogs = await get('https://product.gelatoapis.com/v3/catalogs');
  const list = Array.isArray(catalogs) ? catalogs : catalogs?.data || [];

  console.log(`  OK  catalogs reachable — ${list.length} found:\n`);
  for (const catalog of list.slice(0, 12)) {
    console.log(`        ${String(catalog.catalogUid).padEnd(26)} ${catalog.title || ''}`);
  }
  if (list.length > 12) console.log(`        ... and ${list.length - 12} more`);

  const apparel =
    list.find((c) => String(c.catalogUid).includes('apparel')) || list[0];

  if (apparel) {
    const res = await fetch(
      `https://product.gelatoapis.com/v3/catalogs/${apparel.catalogUid}/products:search`,
      {
        method: 'POST',
        headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 3 }),
      },
    );
    const body = await res.json();
    const products = body?.products || [];
    console.log(`\n  OK  "${apparel.catalogUid}" search returned ${products.length} product(s).`);
    for (const p of products.slice(0, 3)) {
      console.log(`        ${p.productUid}`);
    }
    if (products[0]) {
      console.log(
        `\n  Use one of those productUid values as gelato_product_uid on a row in the\n  Directus shop_products collection, and it will appear in the shop.`,
      );
    }
  }

  console.log('\n  Gelato is configured correctly.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  if (err.status === 401 || err.status === 403) {
    console.error('  That key was rejected. Check you copied the whole key, and that it belongs');
    console.error('  to the right Gelato store (dashboard.gelato.com -> Store -> API keys).\n');
  }
  process.exit(1);
}
