#!/usr/bin/env node
/**
 * Events update (26 Oct 2026, third part):
 *
 *   Exclusively Unfiltered: Zurich: "Details Soon", as on the events mockup.
 *     The card and the page say the details are still being shaped and point
 *     to the community; there is no form until the status changes again.
 *   AntiSocialTalks London: the people behind it point to the profiles already
 *     on the site: Dr. Anmol Kapoor (Meet the Voices) and Jessica Hillier (the
 *     hosts on About), with their photos and titles. BioAro gets its line and
 *     a link to bioaro.com.
 *
 * CMS changes:
 *   events.status   "Details Soon" option
 *   events          Zurich's status, London's people
 *
 * Run after scripts/migrations/events-2026-10-26b.mjs.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/migrations/events-2026-10-26c.mjs
 *
 * Safe to re-run; re-running puts these details back over edits made in the CMS.
 * To open Zurich's RSVPs later, set its status to "RSVP Open" in the CMS.
 */

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('\n  Set DIRECTUS_EMAIL and DIRECTUS_PASSWORD (the admin login).\n');
  process.exit(1);
}

let token = '';
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
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

const EVENT_STATUSES = [
  ['Coming Soon', 'coming_soon'],
  ['Details Soon (no form yet)', 'details_soon'],
  ['Early Bird Open', 'early_bird'],
  ['Registration Open', 'registration_open'],
  ['RSVP Open', 'rsvp_open'],
  ['Invite Only (no public form)', 'invite_only'],
  ['Sold Out', 'sold_out'],
  ['Waitlist', 'waitlist'],
  ['Postponed', 'postponed'],
  ['Cancelled', 'cancelled'],
  ['Completed', 'completed'],
];

const PEOPLE_NOTE =
  'Who is behind it: [{ "role": "Organiser", "name": "…", "bio": "One or two lines" }]. Roles Organiser, Host and Partner read "Organised by", "Hosted by", "Co-organised with" on the card. ' +
  'To use a profile already on the site, add "voice": "<Meet the Voices slug>" (e.g. "dr-anmol-kapoor") or "host": "<host name>"; the photo and title then come from there. Others can have "title" and "url".';

const UPDATES = [
  ['davos-zurich-2027', 'Exclusively Unfiltered: Zurich', { status: 'details_soon' }],
  [
    'london-2026',
    'AntiSocialTalks London',
    {
      people: [
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
          bio: 'Co-organising London and sharing BioAro products with every guest on the day.',
        },
      ],
    },
  ],
];

console.log(`\n  Events update for ${BASE}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  await api('/fields/events/status', { method: 'PATCH', body: { meta: { options: choices(EVENT_STATUSES) } } });
  console.log('  + events.status: "Details Soon" option');
  await api('/fields/events/people', { method: 'PATCH', body: { meta: { note: PEOPLE_NOTE } } });
  console.log('  ~ events.people: note on linking to a voice or a host');

  for (const [slug, name, data] of UPDATES) {
    const [row] = (await api(`/items/events?filter=${q({ slug: { _eq: slug } })}&fields=id&limit=1`)) || [];
    if (!row) throw new Error(`no event with the slug ${slug}`);
    await api(`/items/events/${row.id}`, { method: 'PATCH', body: data });
    console.log(`  ~ ${name}: ${Object.keys(data).join(', ')} updated, /events/${slug}`);
  }

  // The profiles the London people point to must exist, or the cards fall back to initials.
  const voices = (await api(`/items/guests?filter=${q({ status: { _eq: 'published' } })}&fields=name&limit=-1`)) || [];
  const hosts = (await api(`/items/hosts?filter=${q({ status: { _eq: 'published' } })}&fields=name&limit=-1`)) || [];
  const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const anmol = voices.some((v) => slug(v.name) === 'dr-anmol-kapoor');
  const jessica = hosts.some((h) => h.name.trim().toLowerCase() === 'jessica hillier');
  console.log(`  ${anmol ? '=' : 'x'} voice dr-anmol-kapoor ${anmol ? 'found' : 'NOT found (card shows initials)'}`);
  console.log(`  ${jessica ? '=' : 'x'} host Jessica Hillier ${jessica ? 'found' : 'NOT found (card shows initials)'}`);

  console.log('\n  Done. The event pages show this within a minute.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
