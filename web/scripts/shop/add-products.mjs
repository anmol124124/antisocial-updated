#!/usr/bin/env node
/**
 * Put merch into the shop from one JSON file:
 *
 *   node scripts/shop/add-products.mjs merch/products.json
 *
 * For each product it:
 *   1. works out every size/colour's Gelato product UID and checks each one
 *      exists in Gelato (a missing combination is skipped and reported);
 *   2. uploads the print designs (one per placement: front, back, sleeves),
 *      the mockup and the model photo ("photo", the main image) to the CMS;
 *   3. creates the shop_products row, or updates the one with the same slug.
 *
 * Extra colours go in "colorways": each with its own Gelato template, print
 * files (e.g. dark ink on a light garment), mockup, swatch and note, or with
 * "markets": ["IN"] when only Qikink makes it. A colour's model photo can be
 * listed as "photo", or just saved as photos/<slug>-<colour>.png (e.g.
 * photos/tee-opinions-raw-teal.png) next to the JSON file.
 *
 * "gallery" lists more photos of the first colour, shown after the main ones;
 * a colour in "colorways" can have its own "photo" and "gallery".
 *
 * "specs" is the specification on the product page: { "default": { "Fit": …,
 * "Fabric": … }, "IN": { "Fabric": … } }, India's rows over the default ones
 * (Qikink's garments differ from Gelato's). A colour can have its own "specs".
 *
 *   node scripts/shop/add-products.mjs merch/products.json --only-colours
 *       just the sizes/colours and their files (print files, mockups) of products
 *       already in the CMS; titles, prices and the main photo stay as they are
 *
 *   node scripts/shop/add-products.mjs merch/products.json --only=tee-ideas-over-small-talk
 *       just the products with these slugs (comma-separated), e.g. a new one
 *
 *   node scripts/shop/add-products.mjs merch/products.json --order
 *       just the shop order: each product's "sort" from the file
 *
 *   node scripts/shop/add-products.mjs merch/products.json --only-photos
 *       just each product's "photo" and "gallery" (its first colour); nothing else
 *       in the CMS changes and Gelato isn't asked, so GELATO_API_KEY isn't needed
 *
 * Products land as Draft unless "publish": true, so they can be checked in
 * the CMS before going on sale. Nothing is ordered from Gelato.
 *
 * Needs, from the environment or web/.env.local:
 *   DIRECTUS_URL, DIRECTUS_EMAIL, DIRECTUS_PASSWORD   (admin login)
 *   GELATO_API_KEY
 *   NEXT_PUBLIC_SITE_URL   Gelato downloads the design from <site>/api/assets/<id>,
 *                          so this must be the public site address.
 *
 * See scripts/products.example.json for the file format. Paths to images are
 * relative to the JSON file.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { ENV_LOCAL } from '../lib/paths.mjs';

try {
  for (const line of readFileSync(ENV_LOCAL, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  /* no .env.local: rely on the environment */
}

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
const GELATO_KEY = process.env.GELATO_API_KEY;
const args = process.argv.slice(2);
// --check: verify Gelato UIDs and that every file exists, without touching the CMS.
const CHECK = args.includes('--check');
// --retire-others: products in the CMS that are not in this list are set to Draft (never deleted).
const RETIRE = args.includes('--retire-others');
// --only-colours: update sizes/colours, every colour's print files and mockup (the first colour's
// too), the colours' photos, the description (it names the colours), the specification and the
// Qikink setting of products already in the CMS; titles, prices, the main photo and the rest are
// left as they are.
const ONLY_COLOURS = args.includes('--only-colours');
// --order: set only the shop order ("sort") from the file.
const ORDER = args.includes('--order');
// --only-photos: set only the first colour's "photo" and "gallery" from the file.
const ONLY_PHOTOS = args.includes('--only-photos');
const file = args.find((a) => !a.startsWith('--'));

const missing = [
  ['DIRECTUS_EMAIL', CHECK || process.env.DIRECTUS_EMAIL],
  ['DIRECTUS_PASSWORD', CHECK || process.env.DIRECTUS_PASSWORD],
  ['GELATO_API_KEY', ONLY_PHOTOS || GELATO_KEY],
  ['NEXT_PUBLIC_SITE_URL', CHECK || ONLY_PHOTOS || SITE],
].filter(([, v]) => !v);
if (!file || missing.length) {
  console.error('\n  Usage: node scripts/shop/add-products.mjs <products.json> [--check]');
  if (missing.length) console.error(`  Missing: ${missing.map(([k]) => k).join(', ')}`);
  console.error('');
  process.exit(1);
}
if (!CHECK && /localhost|127\.0\.0\.1/.test(SITE)) {
  console.warn(`\n  Note: NEXT_PUBLIC_SITE_URL is ${SITE}. Gelato can't download designs from there;`);
  console.warn('  run this on the server so print links point at the public site.\n');
}

/* ───────────────────────────── helpers ───────────────────────────── */

let token = '';

async function api(path, { method = 'GET', body, raw } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(raw ? {} : { 'Content-Type': 'application/json' }) },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${method} ${path.split('?')[0]}: ${json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
    err.status = res.status;
    throw err;
  }
  return json?.data;
}

const q = (o) => encodeURIComponent(JSON.stringify(o));

async function gelatoProductExists(uid) {
  // A product has dozens of sizes and colours to check: a dropped connection is retried, not fatal.
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`https://product.gelatoapis.com/v3/products/${encodeURIComponent(uid)}`, {
        headers: { 'X-API-KEY': GELATO_KEY },
      });
      if (res.status === 404) return false;
      if (res.status === 429 || res.status >= 500) throw new Error(`Gelato ${res.status} checking ${uid}`);
      if (!res.ok) throw Object.assign(new Error(`Gelato ${res.status} checking ${uid}`), { final: true });
      return true;
    } catch (err) {
      if (err.final || attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// "specs": { "default": { label: text }, "IN": { label: text } }, one group per market at most.
const SPEC_GROUPS = ['default', 'IN', 'US', 'CA', 'GB', 'AE'];
function checkSpecs(specs, where) {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) throw new Error(`${where} must be an object`);
  for (const [group, rows] of Object.entries(specs)) {
    if (!SPEC_GROUPS.includes(group)) throw new Error(`${where}: unknown group "${group}" (use ${SPEC_GROUPS.join(', ')})`);
    if (!rows || typeof rows !== 'object' || !Object.values(rows).every((v) => typeof v === 'string' && v.trim())) {
      throw new Error(`${where}.${group} must map labels to text`);
    }
  }
  return specs;
}
// "heather-navy" -> "Heather Navy"; sizes stay as written ("2XL").
const pretty = (s) => s.replace(/-+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Gelato's placement names for apparel print files. */
const PLACEMENTS = ['front', 'back', 'sleeve-left', 'sleeve-right', 'neck-inner', 'neck-outer'];

const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.pdf': 'application/pdf' };

/**
 * Upload a file once. The title carries a fingerprint of the contents, so a
 * re-run reuses an unchanged file and uploads a file that has been edited.
 */
async function upload(path, label) {
  const bytes = readFileSync(path);
  const title = `${label} [${createHash('sha1').update(bytes).digest('hex').slice(0, 10)}]`;
  const existing = (await api(`/files?filter=${q({ title: { _eq: title } })}&fields=id&limit=1`))?.[0];
  if (existing) return { id: existing.id, reused: true };
  const form = new FormData();
  form.append('title', title);
  const type = TYPES[extname(path).toLowerCase()] || 'application/octet-stream';
  form.append('file', new Blob([bytes], { type }), basename(path));
  const made = await api('/files', { method: 'POST', raw: form });
  return { id: made.id, reused: false };
}

/** Every variant this product describes, before checking Gelato. */
function expandVariants(p) {
  if (Array.isArray(p.variants) && p.variants.length) {
    return p.variants.map((v) => ({ uid: v.uid, color: v.color ?? null, size: v.size ?? null }));
  }
  if (p.uid_template) {
    const colors = p.colors?.length ? p.colors : [null];
    const sizes = p.sizes?.length ? p.sizes : [null];
    const out = [];
    for (const color of colors) {
      for (const size of sizes) {
        const uid = p.uid_template
          .replace('{color}', color ? color.toLowerCase() : '')
          .replace('{size}', size ? size.toLowerCase() : '');
        // "color_label" names a single colour for shoppers ("Black" rather than "Deep Black").
        const name = color ? (colors.length === 1 && p.color_label) || pretty(color) : null;
        out.push({ uid, color: name, size: size ? size.toUpperCase() : null });
      }
    }
    return out;
  }
  if (p.uid) return [{ uid: p.uid, color: null, size: null }];
  throw new Error('needs "uid", "uid_template" (with colors/sizes) or "variants"');
}

/**
 * The extra colours ("colorways") of a product. Each has its own Gelato
 * template, or none when only Qikink makes it ("markets": ["IN"]); those get
 * an "in:" id instead of a Gelato UID.
 */
function colourwayVariants(p, slug, cw) {
  const sizes = cw.sizes?.length ? cw.sizes : p.sizes || [null];
  return sizes.map((size) => {
    const s = size ? size.toUpperCase() : null;
    const uid = cw.uid_template
      ? cw.uid_template.replace('{size}', size ? size.toLowerCase() : '')
      : `in:${slug}:${slugify(cw.color)}:${(size || 'one').toLowerCase()}`;
    return { uid, color: cw.color, size: s, ...(cw.markets?.length ? { markets: cw.markets } : {}) };
  });
}

/* ─────────────────────────────── main ─────────────────────────────── */

const listPath = resolve(file);
const folder = dirname(listPath);
const input = JSON.parse(readFileSync(listPath, 'utf8'));
const listed = Array.isArray(input) ? input : input.products || [];
// --only=<slug>[,<slug>]: just these products, e.g. a new one, leaving the rest as they are in the CMS.
const ONLY = args.find((a) => a.startsWith('--only='))?.slice('--only='.length).split(',').filter(Boolean);
const products = ONLY ? listed.filter((p) => ONLY.includes(p.slug || slugify(p.title))) : listed;
if (ONLY && products.length !== ONLY.length) {
  console.error(`\n  --only: no product with slug ${ONLY.filter((s) => !products.some((p) => (p.slug || slugify(p.title)) === s)).join(', ')} in ${file}\n`);
  process.exit(1);
}

console.log(CHECK ? `\n  Checking ${products.length} product(s), nothing is uploaded\n` : `\n  Adding ${products.length} product(s) to ${BASE}\n`);

try {
  if (!CHECK) {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.DIRECTUS_EMAIL, password: process.env.DIRECTUS_PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  // Sizes/colours and per-placement print files live in JSON fields added the first time this runs.
  const JSON_FIELDS = {
    variants: 'Sizes/colours: [{ "uid": "<Gelato UID>", "color": "Black", "size": "M", "markets": ["IN"] }]; "markets" only for a colour sold in some markets. Filled by scripts/shop/add-products.mjs.',
    colorways:
      'Per colour: { "Teal": { "photo": "<file id>", "mockup": "<file id>", "print_files": { "front": "<url>" }, "swatch": "#106E80", "note": "Regular fit" } }. A colour without files uses the product\'s. Filled by scripts/shop/add-products.mjs.',
    print_files: 'Design per placement: { "front": "<url>", "back": "<url>", "sleeve-left": "<url>" }. Filled by scripts/shop/add-products.mjs.',
    prices: 'Price per currency: { "INR": 999, "USD": 39 }. India pays INR; the US, Canada, the UK and the UAE pay USD. Filled by scripts/shop/add-products.mjs.',
    gallery: 'More photos (file ids), shown after the main photo and mockup of the first colour: ["<file id>", …]. Filled by scripts/shop/add-products.mjs.',
    specs:
      'Specification on the product page: { "default": { "Fit": "Oversized", "Fabric": "…" }, "IN": { "Fabric": "…" } }; "IN" changes rows for India (Qikink\'s garments). A colour can add its own in colorways. Filled by scripts/shop/add-products.mjs.',
  };
  for (const [field, note] of Object.entries(JSON_FIELDS)) {
    try {
      await api(`/fields/shop_products/${field}`);
    } catch (err) {
      if (err.status !== 403 && err.status !== 404) throw err;
      await api('/fields/shop_products', {
        method: 'POST',
        body: { field, type: 'json', meta: { interface: 'input-code', options: { language: 'json' }, note } },
      });
      console.log(`  + shop_products.${field} field\n`);
    }
  }
  }

  // A photo set here replaces any second (back) photo from scripts/shop/gelato-previews.mjs.
  let hasBackPhoto = false;
  // The model photo ("photo") has its own field, added by scripts/migrations/product-photos-2026-10-18.mjs.
  let hasModelPhoto = false;
  // How Qikink makes it for India ("qikink"); its field is added by scripts/migrations/stripe-qikink-2026-10-20.mjs.
  let hasQikink = false;
  if (!CHECK) {
    try {
      await api('/fields/shop_products/mockup_back');
      hasBackPhoto = true;
    } catch {
      /* field not created yet */
    }
    try {
      await api('/fields/shop_products/photo');
      hasModelPhoto = true;
    } catch {
      /* field not created yet */
    }
    try {
      await api('/fields/shop_products/qikink');
      hasQikink = true;
    } catch {
      /* field not created yet */
    }
  }

  // --order: only the shop order ("sort") of the listed products already in the CMS.
  if (ORDER) {
    if (CHECK) throw new Error('--order changes the CMS: leave out --check');
    for (const p of products) {
      const slug = p.slug || slugify(p.title);
      const existing = (await api(`/items/shop_products?filter=${q({ slug: { _eq: slug } })}&fields=id,sort&limit=1`))?.[0];
      if (!existing) console.log(`  x ${p.title}: not in the CMS yet`);
      else if (p.sort == null || existing.sort === p.sort) console.log(`  = ${p.title}: ${existing.sort ?? '-'}`);
      else {
        await api(`/items/shop_products/${existing.id}`, { method: 'PATCH', body: { sort: p.sort } });
        console.log(`  ~ ${p.title}: ${existing.sort ?? '-'} -> ${p.sort}`);
      }
    }
    console.log('\n  Done. The shop shows the new order within a minute.\n');
    process.exit(0);
  }

  // --only-photos: only the first colour's photos of products already in the CMS. Files are
  // checked before anything is uploaded, so one missing photo can't leave a product half done.
  if (ONLY_PHOTOS) {
    if (CHECK) throw new Error('--only-photos changes the CMS: leave out --check');
    let failed = 0;
    for (const p of products) {
      const slug = p.slug || slugify(p.title);
      try {
        if (!p.photo) throw new Error('has no "photo" in the file');
        const paths = [p.photo, ...(p.gallery || [])];
        const lost = paths.filter((rel) => !existsSync(resolve(folder, rel)));
        if (lost.length) throw new Error(`file not found: ${lost.join(', ')}`);
        const existing = (await api(`/items/shop_products?filter=${q({ slug: { _eq: slug } })}&fields=id&limit=1`))?.[0];
        if (!existing) throw new Error('not in the CMS yet');
        const photo = await upload(resolve(folder, p.photo), `Photo: ${slug}`);
        const gallery = [];
        for (const rel of p.gallery || []) gallery.push((await upload(resolve(folder, rel), `Photo: ${slug} ${rel}`)).id);
        await api(`/items/shop_products/${existing.id}`, { method: 'PATCH', body: { photo: photo.id, gallery: gallery.length ? gallery : null } });
        console.log(`  ~ ${p.title}: ${paths.length} photo(s)`);
      } catch (err) {
        failed++;
        console.log(`  x ${p.title || slug}: ${err.message}`);
      }
    }
    console.log(failed ? `\n  ${failed} product(s) NOT updated, see above.\n` : '\n  Done. The shop shows the new photos within a minute.\n');
    process.exit(failed ? 1 : 0);
  }

  let failed = 0;
  for (const p of products) {
    const label = p.title || '(no title)';
    try {
      if (!p.title) throw new Error('needs a "title"');
      // "prices" (per market currency) is the source of truth; "price" stays for older code paths.
      const prices = p.prices && typeof p.prices === 'object' ? p.prices : null;
      if (prices && !Object.values(prices).every((v) => Number(v) > 0)) throw new Error('every entry in "prices" must be above 0');
      if (!prices && !(Number(p.price) > 0)) throw new Error('needs "prices" or a "price" above 0');
      const specs = p.specs ? checkSpecs(p.specs, '"specs"') : null;
      const slug = p.slug || slugify(p.title);

      // 1. Gelato UIDs: the first colour's, then each extra colour's.
      const wanted = expandVariants(p);
      const variants = [];
      for (const v of wanted) {
        if (await gelatoProductExists(v.uid)) variants.push(v);
        else console.log(`    ! ${label}: no Gelato product ${v.uid} (skipped)`);
      }
      if (!variants.length) throw new Error('none of its Gelato UIDs exist');
      for (const cw of p.colorways || []) {
        if (!cw.color) throw new Error('every entry in "colorways" needs a "color"');
        if (!cw.uid_template && !cw.markets?.length) {
          throw new Error(`colour ${cw.color}: needs "uid_template", or "markets" (e.g. ["IN"]) when only Qikink makes it`);
        }
        for (const v of colourwayVariants(p, slug, cw)) {
          if (!cw.uid_template || (await gelatoProductExists(v.uid))) variants.push(v);
          else console.log(`    ! ${label}: no Gelato product ${v.uid} (skipped)`);
        }
      }

      // 2. Files, each uploaded once (by content).
      const byPath = new Map();
      let reused = 0;
      const fileId = async (rel, title) => {
        const path = resolve(folder, rel);
        if (!existsSync(path)) throw new Error(`file not found: ${rel}`);
        if (CHECK) return rel;
        if (!byPath.has(path)) {
          const up = await upload(path, title);
          if (up.reused) reused++;
          byPath.set(path, up.id);
        }
        return byPath.get(path);
      };
      // "prints" maps Gelato placements to designs; "design" alone prints on the front.
      const printMap = async (prints) => {
        const out = {};
        for (const [placement, rel] of Object.entries(prints)) {
          if (placement !== 'default' && !PLACEMENTS.includes(placement)) {
            throw new Error(`unknown placement "${placement}" (use ${PLACEMENTS.join(', ')})`);
          }
          const id = await fileId(rel, `Print file: ${slug} ${basename(rel)}`);
          out[placement] = CHECK ? rel : `${SITE}/api/assets/${id}`;
        }
        return out;
      };
      // Further photos, shown after the main ones: the product's (its first colour) and each colour's own.
      const galleryOf = async (list, where) => {
        if (!Array.isArray(list) || !list.every((g) => typeof g === 'string')) throw new Error(`${where}: "gallery" must be a list of image paths`);
        const ids = [];
        for (const rel of list) ids.push(await fileId(rel, `Photo: ${slug} ${rel}`));
        return ids;
      };

      // Each extra colour: its print files (e.g. dark ink on grey), pictures, swatch and note.
      const colorways = {};
      const firstColour = variants[0]?.color;
      if (firstColour && (p.swatch || p.note)) colorways[firstColour] = { ...(p.swatch ? { swatch: p.swatch } : {}), ...(p.note ? { note: p.note } : {}) };
      for (const cw of p.colorways || []) {
        // A model photo saved as photos/<slug>-<colour>.png (or .jpg) is used without being listed.
        const photo = cw.photo || ['png', 'jpg'].map((ext) => `photos/${slug}-${slugify(cw.color)}.${ext}`).find((rel) => existsSync(resolve(folder, rel)));
        colorways[cw.color] = {
          ...(cw.prints ? { print_files: await printMap(cw.prints) } : {}),
          ...(cw.mockup ? { mockup: await fileId(cw.mockup, `Mockup: ${slug} ${cw.color}`) } : {}),
          ...(photo ? { photo: await fileId(photo, `Photo: ${slug} ${cw.color}`) } : {}),
          ...(cw.gallery ? { gallery: await galleryOf(cw.gallery, `colour ${cw.color}`) } : {}),
          ...(cw.swatch ? { swatch: cw.swatch } : {}),
          ...(cw.note ? { note: cw.note } : {}),
          ...(cw.specs ? { specs: checkSpecs(cw.specs, `${cw.color} "specs"`) } : {}),
        };
      }
      const colourList = [...new Set(variants.map((v) => v.color).filter(Boolean))].join(', ');

      const prints = p.prints || (p.design ? { default: p.design } : null);
      if (!prints || !Object.keys(prints).length) throw new Error('needs "prints" (or "design")');
      const printFiles = await printMap(prints);
      let mockup = null;
      if (p.mockup) {
        const mockPath = resolve(folder, p.mockup);
        if (!existsSync(mockPath)) throw new Error(`mockup file not found: ${p.mockup}`);
        if (!CHECK) mockup = await upload(mockPath, `Mockup: ${slug}`);
      }

      const gallery = p.gallery != null ? await galleryOf(p.gallery, 'product') : [];

      if (ONLY_COLOURS && !CHECK) {
        const existing = (await api(`/items/shop_products?filter=${q({ slug: { _eq: slug } })}&fields=id&limit=1`))?.[0];
        if (!existing) throw new Error('not in the CMS yet: run without --only-colours first');
        await api(`/items/shop_products/${existing.id}`, {
          method: 'PATCH',
          // The first colour's print files and mockup are a colour's files too; the description names the colours.
          body: {
            variants,
            colorways,
            print_file_url: printFiles.front || printFiles.default || Object.values(printFiles)[0],
            print_files: printFiles.default ? null : printFiles,
            ...(mockup ? { mockup: mockup.id } : {}),
            ...(p.description ? { description: p.description } : {}),
            ...(p.qikink && hasQikink ? { qikink: p.qikink } : {}),
            ...(p.specs ? { specs } : {}),
            ...(p.gallery ? { gallery } : {}),
          },
        });
        console.log(`  ~ ${label}: ${variants.length} variant(s) in ${colourList}${reused ? ` (${reused} file(s) already uploaded)` : ''}`);
        continue;
      }

      let photo = null;
      if (p.photo) {
        const photoPath = resolve(folder, p.photo);
        if (!existsSync(photoPath)) throw new Error(`photo file not found: ${p.photo}`);
        if (!CHECK && !hasModelPhoto) throw new Error('the CMS has no "photo" field yet: run scripts/migrations/product-photos-2026-10-18.mjs first');
        if (!CHECK) photo = await upload(photoPath, `Photo: ${slug}`);
      }

      if (CHECK) {
        const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))].join(' ');
        console.log(`  ok ${label}: ${variants.length} variant(s) [${sizes}] in ${colourList || 'one colour'}, prints: ${Object.keys(printFiles).join(' + ')}`);
        continue;
      }

      // 3. Row
      const row = {
        title: p.title,
        slug,
        description: p.description ?? null,
        price: Number(p.price ?? prices?.INR ?? Object.values(prices || {})[0]),
        currency: (p.currency || (prices?.INR ? 'INR' : Object.keys(prices || {})[0]) || 'INR').toUpperCase(),
        prices,
        gelato_product_uid: variants[0].uid,
        variants: variants.length > 1 || variants[0].color || variants[0].size ? variants : null,
        print_file_url: printFiles.front || printFiles.default || Object.values(printFiles)[0],
        print_files: printFiles.default ? null : printFiles,
        ...(mockup ? { mockup: mockup.id, ...(hasBackPhoto ? { mockup_back: null } : {}) } : {}),
        ...(photo ? { photo: photo.id } : {}),
        colorways: Object.keys(colorways).length ? colorways : null,
        specs,
        gallery: gallery.length ? gallery : null,
        ...(p.qikink && hasQikink ? { qikink: p.qikink } : {}),
        status: p.publish ? 'published' : 'draft',
        ...(p.sort != null ? { sort: p.sort } : {}),
      };
      const existing = (await api(`/items/shop_products?filter=${q({ slug: { _eq: slug } })}&fields=id&limit=1`))?.[0];
      if (existing) await api(`/items/shop_products/${existing.id}`, { method: 'PATCH', body: row });
      else await api('/items/shop_products', { method: 'POST', body: row });

      console.log(
        `  ${existing ? '~' : '+'} ${label}: ${variants.length} variant(s), ${prices ? Object.entries(prices).map(([c, v]) => `${c} ${v}`).join(' / ') : `${row.currency} ${row.price}`}, ${row.status}` +
          `, prints: ${Object.keys(printFiles).join(' + ')}${reused ? ` (${reused} file(s) already uploaded)` : ''}`,
      );
    } catch (err) {
      failed++;
      console.log(`  x ${label}: ${err.message}`);
    }
  }

  if (RETIRE && !CHECK && !failed) {
    const keep = new Set(listed.map((p) => p.slug || slugify(p.title)));
    const all = (await api('/items/shop_products?fields=id,slug,title,status&limit=-1')) || [];
    for (const row of all.filter((r) => !keep.has(r.slug) && r.status !== 'draft')) {
      await api(`/items/shop_products/${row.id}`, { method: 'PATCH', body: { status: 'draft' } });
      console.log(`  - ${row.title}: set to Draft (not in this list)`);
    }
  }

  console.log(`\n  Done${failed ? `, ${failed} failed` : ''}. Check them in the CMS (shop_products), then set Published.\n`);
  if (failed) process.exitCode = 1;
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exitCode = 1;
}
