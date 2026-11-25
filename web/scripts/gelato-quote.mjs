#!/usr/bin/env node
/**
 * Gelato's full delivery quote for one product, size and colour to one
 * country, as checkout asks for it: every print facility, every delivery
 * method with its price, and what Gelato charges for the product itself.
 * Read-only: nothing is ordered.
 *
 *   node scripts/gelato-quote.mjs <product-slug> <country> [size] [colour]
 *   node scripts/gelato-quote.mjs tee-anti-bullshit US M Black
 *
 * Country: US, CA, GB or AE. Run it in the site's folder (where .env.local is).
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const [slug, countryArg, sizeArg, colourArg] = process.argv.slice(2);
const ADDRESSES = {
  US: { firstName: 'Test', lastName: 'Order', addressLine1: '350 5th Ave', city: 'New York', state: 'NY', postCode: '10118', country: 'US', email: 'test@example.com', phone: '+12125550100' },
  CA: { firstName: 'Test', lastName: 'Order', addressLine1: '290 Bremner Blvd', city: 'Toronto', state: 'ON', postCode: 'M5V 3L9', country: 'CA', email: 'test@example.com', phone: '+14165550100' },
  GB: { firstName: 'Test', lastName: 'Order', addressLine1: '10 Downing St', city: 'London', postCode: 'SW1A 2AA', country: 'GB', email: 'test@example.com', phone: '+442071234567' },
  AE: { firstName: 'Test', lastName: 'Order', addressLine1: 'Sheikh Zayed Road 1', city: 'Dubai', state: 'Dubai', postCode: '00000', country: 'AE', email: 'test@example.com', phone: '+971500000000' },
};
const country = (countryArg || '').toUpperCase();
if (!slug || !ADDRESSES[country]) {
  console.log('\n  node scripts/gelato-quote.mjs <product-slug> <US|CA|GB|AE> [size] [colour]\n');
  process.exit(1);
}

const CMS = (process.env.DIRECTUS_URL || '').replace(/\/$/, '');
const res = await fetch(`${CMS}/items/shop_products?${new URLSearchParams({ filter: JSON.stringify({ slug: { _eq: slug } }), fields: '*', limit: '1' })}`, {
  headers: { Authorization: `Bearer ${process.env.DIRECTUS_TOKEN || ''}` },
});
const product = (await res.json().catch(() => null))?.data?.[0];
if (!product) {
  console.log(`\n  No product with the slug "${slug}" (HTTP ${res.status}).\n`);
  process.exit(1);
}

const variants = Array.isArray(product.variants) && product.variants.length ? product.variants : [{ uid: product.gelato_product_uid }];
const colour = colourArg || variants.find((v) => v.color)?.color || null;
const variant =
  variants.find((v) => (!colour || v.color === colour) && (!sizeArg || v.size === sizeArg) && (sizeArg || v.size === 'M' || !v.size)) ||
  variants.find((v) => (!colour || v.color === colour) && (!sizeArg || v.size === sizeArg));
if (!variant) {
  console.log(`\n  ${product.title} has no ${[colour, sizeArg].filter(Boolean).join(' / ')}. It has: ${variants.map((v) => [v.color, v.size].filter(Boolean).join(' / ')).join(', ')}\n`);
  process.exit(1);
}

// The print files exactly as the site sends them (lib/content printFilesFor).
const own = colour && product.colorways?.[colour]?.print_files;
const map = own && Object.values(own).some(Boolean) ? own : product.print_files || {};
let files = Object.entries(map).filter(([, url]) => typeof url === 'string' && url).map(([type, url]) => ({ type, url }));
if (!files.length && !(own && Object.values(own).some(Boolean)) && product.print_file_url) files = [{ type: 'default', url: product.print_file_url }];

const body = {
  orderReferenceId: `quote-check-${Date.now()}`,
  customerReferenceId: 'quote-check',
  currency: 'USD',
  allowMultipleQuotes: true,
  recipient: ADDRESSES[country],
  products: [{ itemReferenceId: 'line-1', productUid: variant.uid, quantity: 1, files }],
};

console.log(`\n  ${product.title} · ${[variant.color, variant.size].filter(Boolean).join(' / ')} → ${country}`);
console.log(`  product ${variant.uid}`);
console.log(`  prints  ${files.map((f) => f.type).join(', ') || '(none)'}`);

const quote = await fetch('https://order.gelatoapis.com/v4/orders:quote', {
  method: 'POST',
  headers: { 'X-API-KEY': process.env.GELATO_API_KEY || '', 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const json = await quote.json().catch(() => null);
if (!quote.ok) {
  console.log(`\n  Gelato ${quote.status}: ${json?.message || quote.statusText}`);
  for (const d of json?.details || []) console.log(`    ${d.message || JSON.stringify(d)}`);
  process.exit(1);
}

for (const [i, q] of (json.quotes || []).entries()) {
  console.log(`\n  Quote ${i + 1}: printed in ${q.fulfillmentCountry || '?'}  (items ${(q.itemReferenceIds || []).join(', ')})`);
  for (const p of q.products || []) {
    console.log(`    product price   ${p.currency || 'USD'} ${p.price ?? '?'}  (${p.productUid})`);
  }
  console.log('    delivery methods:');
  for (const m of q.shipmentMethods || []) {
    const extra = Object.entries(m)
      .filter(([k]) => !['name', 'shipmentMethodUid', 'price', 'currency', 'minDeliveryDays', 'maxDeliveryDays'].includes(k))
      .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' ');
    console.log(`      ${String(m.currency || '').padEnd(4)}${String(m.price).padStart(7)}  ${m.minDeliveryDays ?? '?'}-${m.maxDeliveryDays ?? '?'} d  ${m.name}  [${m.shipmentMethodUid}]`);
    if (extra) console.log(`             ${extra}`);
  }
}
console.log('');
