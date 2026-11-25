#!/usr/bin/env node
/**
 * Adds the two collections this Next.js site needs on top of cms/provision-schema.js
 * (`topics` and `shop_products`), then seeds the content the old static index.html
 * had hardcoded so the site has something to render.
 *
 *   DIRECTUS_URL=https://cms.antisocialtalks.com \
 *   DIRECTUS_EMAIL=you@example.com \
 *   DIRECTUS_PASSWORD='...' \
 *   npm run seed
 *
 * Safe to re-run: collections and rows are only created when missing. Nothing
 * is ever deleted or overwritten, so edits made in the Directus UI survive.
 */

const BASE = (process.env.DIRECTUS_URL || 'https://cms.antisocialtalks.com').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;
const TOKEN = process.env.DIRECTUS_TOKEN;

if (!TOKEN && (!EMAIL || !PASSWORD)) {
  console.error('\n  Set DIRECTUS_TOKEN, or DIRECTUS_EMAIL and DIRECTUS_PASSWORD.\n');
  process.exit(1);
}

let auth = TOKEN;

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = body?.errors?.[0]?.message || res.statusText;
    const err = new Error(`${res.status} ${message} (${path})`);
    err.status = res.status;
    throw err;
  }
  return body;
}

async function login() {
  if (auth) return;
  const body = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  auth = body.data.access_token;
  console.log('  logged in');
}

/* ───────────────────────── field helpers ───────────────────────── */

const text = (field, extra = {}) => ({
  field,
  type: 'string',
  meta: { interface: 'input', width: 'half', ...extra },
});

const longText = (field) => ({
  field,
  type: 'text',
  meta: { interface: 'input-multiline' },
});

const image = (field) => ({
  field,
  type: 'uuid',
  meta: { interface: 'file-image', special: ['file'] },
});

const number = (field, type = 'float') => ({
  field,
  type,
  meta: { interface: 'input', width: 'half' },
});

const status = (choices, defaultValue) => ({
  field: 'status',
  type: 'string',
  schema: { default_value: defaultValue },
  meta: {
    interface: 'select-dropdown',
    width: 'half',
    options: { choices: choices.map(([t, v]) => ({ text: t, value: v })) },
  },
});

async function collectionExists(name) {
  try {
    await api(`/collections/${name}`);
    return true;
  } catch (err) {
    if (err.status === 403 || err.status === 404) return false;
    throw err;
  }
}

async function ensureCollection(definition) {
  if (await collectionExists(definition.collection)) {
    console.log(`  = ${definition.collection} already exists`);
    return;
  }
  await api('/collections', { method: 'POST', body: JSON.stringify(definition) });
  console.log(`  + ${definition.collection} created`);
}

/**
 * Image fields need a relation to directus_files. Without it the CMS uploads
 * the file to the library and then cannot save it on the item.
 */
async function ensureFileRelation(collection, field) {
  try {
    await api(`/relations/${collection}/${field}`);
    console.log(`  = ${collection}.${field} already linked to files`);
  } catch (err) {
    if (err.status !== 403 && err.status !== 404) throw err;
    await api('/relations', {
      method: 'POST',
      body: JSON.stringify({ collection, field, related_collection: 'directus_files', schema: { on_delete: 'SET NULL' } }),
    });
    console.log(`  + ${collection}.${field} -> directus_files`);
  }
}

/** Create a row only if nothing in the collection already matches on `key`. */
async function ensureRow(collection, key, row) {
  const filter = encodeURIComponent(JSON.stringify({ [key]: { _eq: row[key] } }));
  const existing = await api(`/items/${collection}?filter=${filter}&limit=1`);
  if (existing.data?.length) {
    console.log(`  = ${collection}: "${row[key]}" already there`);
    return;
  }
  await api(`/items/${collection}`, { method: 'POST', body: JSON.stringify(row) });
  console.log(`  + ${collection}: "${row[key]}"`);
}

/* ───────────────────────────── content ──────────────────────────── */

const TOPICS = [
  ['Human', 'The stories behind the people you think you know.'],
  ['Health', 'What your doctor won’t say in twelve minutes.'],
  ['Science', 'The questions nobody funds, asked anyway.'],
  ['Technology', 'Built fast. Explained slow.'],
  ['Business', 'Built in public. Broken in private.'],
  ['Society', 'The rules nobody voted on.'],
  ['The Future', 'Already happening. Just not evenly.'],
];

const GUESTS = [
  ['Marjan Khodadad', 'Fashion Designer', 'https://www.instagram.com/marmar_moda'],
  ['Gauri Singh', 'Dancer | Actor | Reality show artist', 'https://www.instagram.com/thegaurisingh'],
  ['Sunny Kalra', 'Actor | Dubai Luxury Property Specialist', 'https://www.instagram.com/sunny_kalra55'],
  ['Mahbod Mahmoudi Aznaveh', 'Musician', 'https://www.instagram.com/mahbod_ofc'],
  ['Mahsad Ziaee', 'Actor', null],
  ['Abdu Rozik', 'Singer | Actor | Boxer | Entrepreneur', 'https://www.instagram.com/abdu_rozik'],
];

async function main() {
  console.log(`\n  Seeding ${BASE}\n`);
  await login();

  /* 1. The two collections the website adds on top of the original schema. */

  await ensureCollection({
    collection: 'topics',
    meta: { icon: 'label', note: 'Topic tiles on the home page and the episode filters.' },
    schema: {},
    fields: [
      { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
      text('title'),
      text('slug', { note: 'URL-safe, e.g. "the-future". Leave blank to derive from the title.' }),
      longText('blurb'),
      image('image'),
      number('sort', 'integer'),
    ],
  });

  await ensureCollection({
    collection: 'shop_products',
    meta: {
      icon: 'storefront',
      note: 'Merch. Each row maps to one Gelato product UID — run `npm run verify:gelato` to list valid UIDs.',
    },
    schema: {},
    fields: [
      { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
      text('title'),
      text('slug', { note: 'URL-safe. Leave blank to derive from the title.' }),
      longText('description'),
      text('gelato_product_uid', {
        width: 'full',
        note: 'From Gelato, e.g. apparel_product_gca_t-shirt_gsc_crewneck_...',
      }),
      text('print_file_url', {
        width: 'full',
        note: 'Public URL of the artwork Gelato prints. Must be reachable from the internet.',
      }),
      image('mockup'),
      number('price'),
      text('currency', { note: 'ISO code, e.g. USD or AED. Defaults to NEXT_PUBLIC_SHOP_CURRENCY.' }),
      number('sort', 'integer'),
      status([['Draft', 'draft'], ['Published', 'published']], 'draft'),
    ],
  });

  await ensureFileRelation('topics', 'image');
  await ensureFileRelation('shop_products', 'mockup');

  /* 2. Seed the content the static site had hardcoded. */

  console.log('');
  for (const [i, [title, blurb]] of TOPICS.entries()) {
    await ensureRow('topics', 'title', {
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      blurb,
      sort: i + 1,
    });
  }

  console.log('');
  for (const [name, designation, instagram] of GUESTS) {
    await ensureRow('guests', 'name', {
      name,
      designation,
      instagram_url: instagram,
      status: 'published',
    });
  }

  console.log('');
  await ensureRow('episodes', 'title', {
    title: 'Episode 01: The AntiSocial Question',
    description:
      'Episode 01 is on its way. Subscribe on YouTube to hear it the day it comes out.',
    status: 'coming_soon',
    topics: 'Human, Society',
  });

  console.log('');
  await ensureRow('chapters', 'city', {
    city: 'Dubai',
    slug: 'dubai',
    theme: 'Where the conversation starts.',
    status: 'coming_soon',
  });

  console.log('\n  Done.\n');
  console.log('  Next:');
  console.log('   1. Give the website its own access token:');
  console.log('      node scripts/create-site-token.mjs   (then put it in DIRECTUS_TOKEN)');
  console.log('      Nothing needs to be made public.');
  console.log('   2. Upload photos onto the guest rows.');
  console.log('   3. npm run verify:gelato, then add shop_products rows.\n');
}

main().catch((err) => {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
});
