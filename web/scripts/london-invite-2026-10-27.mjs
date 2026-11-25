#!/usr/bin/env node
/**
 * London: the private invitation link, and BioAro's logo (27 Oct 2026).
 *
 *   /invite/<code>  A private page for AntiSocialTalks London. Whoever has the
 *     link fills in the form, goes straight on the guest list and is emailed
 *     their invitation (with the venue and a calendar entry). The page is not
 *     linked anywhere, not in the sitemap and not indexed.
 *   BioAro's logo (events/logos/bioaro.png) on its card in "The People Behind It".
 *
 * CMS changes:
 *   events               invite_code, invite_venue, invite_message (added if missing)
 *   event_registrations  guest_key (added if missing); "Invitation link" kind
 *   website policy       may read event_registrations.guest_key (a fingerprint
 *                        of event + email, to spot a guest accepting twice; the
 *                        site still cannot read names or emails)
 *   files                BioAro logo (uploaded once)
 *   events               London: people (BioAro with its logo), invite_code
 *                        (made once; kept on re-runs)
 *
 * Run after scripts/events-2026-10-26c.mjs.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/london-invite-2026-10-27.mjs [--new-code]
 *
 * --new-code  replaces London's link with a new one (if the old one was shared
 *             too widely); the old link stops working within a minute.
 *
 * Safe to re-run.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const LOGO = resolve(here, '..', 'events', 'logos', 'bioaro.png');
const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;
const NEW_CODE = process.argv.includes('--new-code');

const WEBSITE_POLICY = 'Website (read content, create submissions)';
const LONDON = 'london-2026';

if (!EMAIL || !PASSWORD) {
  console.error('\n  Set DIRECTUS_EMAIL and DIRECTUS_PASSWORD (the admin login).\n');
  process.exit(1);
}

let token = '';
async function api(path, { method = 'GET', body, raw } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(raw ? {} : { 'Content-Type': 'application/json' }), Authorization: `Bearer ${token}` },
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
const choices = (list) => ({ choices: list.map(([text, value]) => ({ text, value })) });

const EVENT_FIELDS = [
  {
    field: 'invite_code',
    type: 'string',
    meta: {
      interface: 'input',
      width: 'half',
      note: 'The private invitation link is /invite/<this code>. Anyone with the link can accept and is emailed their invitation. Change it to stop an old link working. Never shown on the site.',
    },
  },
  {
    field: 'invite_venue',
    type: 'text',
    meta: {
      interface: 'input-multiline',
      note: 'The venue as the invitation email gives it, name and address, e.g. "The Venue, 1 Example Street, London W1". Only in the invitation email and its calendar entry, never on the site.',
    },
  },
  {
    field: 'invite_message',
    type: 'text',
    meta: {
      interface: 'input-multiline',
      note: 'A note in the invitation email, one line each: arrival time, dress code, what to bring. Only in the email.',
    },
  },
];

const GUEST_KEY = {
  field: 'guest_key',
  type: 'string',
  meta: {
    interface: 'input',
    hidden: true,
    readonly: true,
    note: 'A fingerprint of the event and the email, so a guest who accepts an invitation twice is not added twice.',
  },
};

const REGISTRATION_KINDS = [
  ['Interest', 'interest'],
  ['Booking', 'booking'],
  ['RSVP', 'rsvp'],
  ['Invitation link', 'invite'],
  ['Waitlist', 'waitlist'],
];

const londonPeople = (logo) => [
  {
    role: 'Host',
    host: 'Jessica Hillier',
    name: 'Jessica Hillier',
    title: 'Host & Moderator, AntiSocialTalks',
    bio: 'Hosts the afternoon and keeps the conversation honest.',
  },
  // Guest host, not organiser (corrected 27 Oct 2026; see london-people-2026-10-27.mjs).
  {
    role: 'Guest Host',
    credit: 'Guest host',
    voice: 'dr-anmol-kapoor',
    name: 'Dr. Anmol Kapoor',
    title: 'Founder & CEO, Kapoor Wealth Partners',
    bio: 'Joins Jessica as guest host for the afternoon.',
  },
  {
    role: 'Co-organiser and partner',
    name: 'BioAro',
    title: 'The intelligence layer for Healthcare 3.0',
    url: 'https://www.bioaro.com',
    logo,
    bio: 'Co-organising London and sharing BioAro products with every guest on the day.',
  },
];

/** Upload once: the title carries a fingerprint of the contents. */
async function upload(path, label) {
  const bytes = readFileSync(path);
  const title = `${label} [${createHash('sha1').update(bytes).digest('hex').slice(0, 10)}]`;
  const existing = (await api(`/files?filter=${q({ title: { _eq: title } })}&fields=id&limit=1`))?.[0];
  if (existing) return { id: existing.id, reused: true };
  const form = new FormData();
  form.append('title', title);
  form.append('file', new Blob([bytes], { type: 'image/png' }), basename(path));
  return { id: (await api('/files', { method: 'POST', raw: form })).id, reused: false };
}

/** 12 letters and digits a person can read back over the phone (no 0/o, 1/l). */
function newCode() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  return `london-${[...randomBytes(12)].map((b) => alphabet[b % alphabet.length]).join('')}`;
}

async function addField(collection, f) {
  try {
    await api(`/fields/${collection}/${f.field}`);
    console.log(`  = ${collection}.${f.field}`);
  } catch (err) {
    if (err.status !== 403 && err.status !== 404) throw err;
    await api(`/fields/${collection}`, { method: 'POST', body: f });
    console.log(`  + ${collection}.${f.field}`);
  }
}

console.log(`\n  London invitation link for ${BASE}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  for (const f of EVENT_FIELDS) await addField('events', f);
  await addField('event_registrations', GUEST_KEY);
  await api('/fields/event_registrations/kind', { method: 'PATCH', body: { meta: { options: choices(REGISTRATION_KINDS) } } });
  console.log('  + event_registrations.kind: "Invitation link" option');

  const policy = (await api(`/policies?filter=${q({ name: { _eq: WEBSITE_POLICY } })}&fields=id&limit=1`))?.[0];
  if (!policy) throw new Error('website policy not found: run scripts/create-site-token.mjs first.');
  const [read] =
    (await api(
      `/permissions?filter=${q({ _and: [{ policy: { _eq: policy.id } }, { collection: { _eq: 'event_registrations' } }, { action: { _eq: 'read' } }] })}&fields=id,fields&limit=1`,
    )) || [];
  if (!read) throw new Error('the website cannot read event_registrations yet: run scripts/payments-schema-2026-10-11.mjs first.');
  const allowed = Array.isArray(read.fields) ? read.fields : String(read.fields || '').split(',').filter(Boolean);
  if (allowed.includes('*') || allowed.includes('guest_key')) {
    console.log('  = website may read event_registrations.guest_key');
  } else {
    await api(`/permissions/${read.id}`, { method: 'PATCH', body: { fields: [...allowed, 'guest_key'] } });
    console.log('  + website may read event_registrations.guest_key (still no names or emails)');
  }

  const logo = await upload(LOGO, 'Logo: BioAro');
  console.log(`  ${logo.reused ? '=' : '+'} BioAro logo ${logo.reused ? 'already uploaded' : 'uploaded'}`);

  const [london] = (await api(`/items/events?filter=${q({ slug: { _eq: LONDON } })}&fields=id,title,invite_code,invite_venue&limit=1`)) || [];
  if (!london) throw new Error(`no event with the slug ${LONDON}`);
  const code = !NEW_CODE && london.invite_code ? london.invite_code : newCode();
  await api(`/items/events/${london.id}`, { method: 'PATCH', body: { people: londonPeople(logo.id), invite_code: code } });
  console.log(`  ~ ${london.title}: BioAro logo on its card`);
  console.log(`  ${code === london.invite_code ? '=' : '+'} ${london.title}: invitation link ${code === london.invite_code ? 'kept' : NEW_CODE ? 'replaced' : 'made'}`);

  console.log('\n  The private invitation link (share it only with guests):');
  console.log(`    https://antisocialtalks.com/invite/${code}`);
  console.log(`    https://stage.antisocialtalks.com/invite/${code}   (staging, for testing)`);
  if (!london.invite_venue) {
    console.log('\n  ! London has no invite_venue yet. Add the venue (name and address) in the CMS before sharing');
    console.log('    the link; until then the invitation says the venue follows by email.');
  }
  console.log('\n  Done. The page works within a minute.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
