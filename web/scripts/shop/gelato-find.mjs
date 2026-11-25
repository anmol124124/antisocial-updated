#!/usr/bin/env node
/**
 * Find Gelato product UIDs for the shop. Read-only: nothing is ordered.
 *
 *   node scripts/shop/gelato-find.mjs
 *       every catalog (t-shirts, hoodies, mugs, posters...)
 *
 *   node scripts/shop/gelato-find.mjs t-shirts
 *       that catalog's options (colours, sizes, ...) and a few example UIDs
 *
 *   node scripts/shop/gelato-find.mjs t-shirts GarmentColor=black GarmentSize=m
 *       products matching those options, with their full UIDs
 *
 * Reads GELATO_API_KEY from the environment or web/.env.local.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENV_LOCAL } from '../lib/paths.mjs';

try {
  for (const line of readFileSync(ENV_LOCAL, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  /* no .env.local: rely on the environment */
}

const KEY = process.env.GELATO_API_KEY;
if (!KEY) {
  console.error('\n  GELATO_API_KEY is not set (web/.env.local).\n');
  process.exit(1);
}

async function gelato(path, body) {
  const res = await fetch(`https://product.gelatoapis.com/v3${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Gelato ${res.status}: ${json?.message || res.statusText}`);
  return json;
}

const [catalog, ...filters] = process.argv.slice(2);

try {
  if (!catalog) {
    const raw = await gelato('/catalogs');
    const list = Array.isArray(raw) ? raw : raw?.data || [];
    console.log(`\n  ${list.length} catalogs. Next: node scripts/shop/gelato-find.mjs <catalog>\n`);
    for (const c of list) console.log(`    ${c.catalogUid.padEnd(32)} ${c.title}`);
    console.log('');
  } else if (!filters.length) {
    const info = await gelato(`/catalogs/${encodeURIComponent(catalog)}`);
    console.log(`\n  ${info.title} (${catalog}) options:\n`);
    for (const a of info.productAttributes || []) {
      const vals = Array.isArray(a.values) ? a.values : Object.values(a.values || {});
      const values = vals.map((v) => (typeof v === 'string' ? v : v.productAttributeValueUid || v.title));
      console.log(`  ${a.productAttributeUid}`);
      console.log(`      ${values.slice(0, 40).join(', ')}${values.length > 40 ? `, ... (${values.length})` : ''}`);
    }
    const sample = await gelato(`/catalogs/${encodeURIComponent(catalog)}/products:search`, { limit: 5 });
    console.log('\n  Example UIDs:');
    for (const p of sample.products || []) console.log(`    ${p.productUid}`);
    console.log(`\n  Next: node scripts/shop/gelato-find.mjs ${catalog} OptionName=value ...\n`);
  } else {
    const attributeFilters = {};
    for (const f of filters) {
      const [k, v] = f.split('=');
      if (!k || !v) throw new Error(`"${f}" should look like Name=value`);
      (attributeFilters[k] ||= []).push(v);
    }
    const found = await gelato(`/catalogs/${encodeURIComponent(catalog)}/products:search`, { attributeFilters, limit: 50 });
    const products = found.products || [];
    console.log(`\n  ${products.length} match${products.length === 1 ? '' : 'es'}${products.length === 50 ? ' (first 50; add more filters)' : ''}:\n`);
    for (const p of products) {
      const a = p.attributes || {};
      const brief = ['GarmentColor', 'GarmentSize', 'GarmentPrint', 'ApparelManufacturer']
        .filter((k) => a[k])
        .map((k) => `${k}=${a[k]}`)
        .join('  ');
      console.log(`    ${p.productUid}${brief ? `\n        ${brief}` : ''}`);
    }
    console.log('');
  }
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exitCode = 1;
}
