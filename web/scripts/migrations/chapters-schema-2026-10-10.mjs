#!/usr/bin/env node
/**
 * AntiSocial Chapters — CMS schema and launch content (2026-10-10).
 *
 * Creates, only when missing:
 *   events               one event inside a chapter; status + draft/published
 *   event_registrations  interest / booking / waitlist sign-ups for an event
 *   applications         organiser proposals, speakers, local team, partners
 *
 * Then:
 *   - makes sure the India and Dubai chapters exist
 *   - seeds the two launch events (Coming Soon, no dates/venues — those are
 *     never invented; the team fills them in when confirmed)
 *   - lets the website's policy read *published* events and create
 *     registrations, applications and (proposal) files — nothing more. It still
 *     cannot read anyone's registration or application back.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/migrations/chapters-schema-2026-10-10.mjs
 *
 * Idempotent: everything is created only if it isn't there; existing rows and
 * edits made in the Directus UI are never overwritten.
 */

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;
const WEBSITE_POLICY = 'Website (read content, create submissions)';

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
    const err = new Error(`${method} ${path}: ${json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
    err.status = res.status;
    throw err;
  }
  return json?.data;
}

const q = (o) => encodeURIComponent(JSON.stringify(o));

/* ───────────────────────────── field helpers ───────────────────────────── */

const pk = { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } };
const text = (field, meta = {}) => ({ field, type: 'string', meta: { interface: 'input', width: 'half', ...meta } });
const long = (field, meta = {}) => ({ field, type: 'text', meta: { interface: 'input-multiline', ...meta } });
const int = (field, meta = {}) => ({ field, type: 'integer', meta: { interface: 'input', width: 'half', ...meta } });
const bool = (field, def = false, meta = {}) => ({
  field,
  type: 'boolean',
  schema: { default_value: def },
  meta: { interface: 'boolean', width: 'half', ...meta },
});
const uuidRef = (field, iface, meta = {}) => ({ field, type: 'uuid', meta: { interface: iface, special: ['file'], ...meta } });
const m2o = (field, meta = {}) => ({ field, type: 'integer', meta: { interface: 'select-dropdown-m2o', special: ['m2o'], ...meta } });
const timestamp = (field, meta = {}) => ({ field, type: 'timestamp', meta: { interface: 'datetime', width: 'half', ...meta } });
const created = { field: 'date_created', type: 'timestamp', meta: { special: ['date-created'], interface: 'datetime', readonly: true, width: 'half' } };
const choice = (field, choices, def, meta = {}) => ({
  field,
  type: 'string',
  schema: { default_value: def },
  meta: {
    interface: 'select-dropdown',
    display: 'labels',
    width: 'half',
    options: { choices: choices.map(([t, v]) => ({ text: t, value: v })) },
    ...meta,
  },
});

/* ───────────────────────────── collections ───────────────────────────── */

const EVENT_STATUSES = [
  ['Coming Soon', 'coming_soon'],
  ['Registration Open', 'registration_open'],
  ['Sold Out', 'sold_out'],
  ['Waitlist', 'waitlist'],
  ['Postponed', 'postponed'],
  ['Cancelled', 'cancelled'],
  ['Completed', 'completed'],
];

const COLLECTIONS = [
  {
    collection: 'events',
    meta: {
      icon: 'event',
      note: 'Chapter events. Only "Published" events appear on the site — keep speakers, partners and schedules in Draft until confirmed.',
      sort_field: 'sort',
    },
    schema: {},
    fields: [
      pk,
      text('title', { width: 'full', required: true }),
      text('slug', { note: 'URL, e.g. "dubai-chapter-launch". Leave blank to derive from the title.' }),
      choice('visibility', [['Draft', 'draft'], ['Published', 'published']], 'draft', { note: 'Draft = not on the website.' }),
      choice('status', EVENT_STATUSES, 'coming_soon'),
      m2o('chapter', { note: 'Which chapter (city community) runs this event.' }),
      text('region', { note: 'Shown on the card, e.g. "India" or "Dubai".' }),
      text('city', { note: 'Leave empty until the city is confirmed — shows "To Be Announced".' }),
      text('blurb', { width: 'full', note: 'One line for the card.' }),
      text('theme', { width: 'full' }),
      long('description'),
      long('audience', { note: 'Who it is for.' }),
      timestamp('starts_at', { note: 'Leave empty until confirmed — the site shows "To Be Announced".' }),
      text('timezone', { note: 'IANA zone, e.g. Asia/Dubai or Asia/Kolkata.' }),
      text('venue_name'),
      text('venue_address'),
      text('map_url', { width: 'full' }),
      long('speakers', { note: 'One per line. Only after confirmation.' }),
      text('moderator'),
      long('schedule', { note: 'One session per line.' }),
      long('ticket_info', { note: 'Ticket types, availability, price and currency once confirmed.' }),
      int('capacity'),
      long('accessibility_info'),
      long('terms', { note: 'Cancellation / refund terms.' }),
      text('contact_email'),
      text('recording_url', { width: 'full', note: 'After the event, if recorded.' }),
      uuidRef('image', 'file-image'),
      int('sort'),
    ],
  },
  {
    collection: 'event_registrations',
    meta: { icon: 'how_to_reg', note: 'Sign-ups from the website. Export with the toolbar; filter by event and status.' },
    schema: {},
    fields: [
      pk,
      m2o('event'),
      choice('kind', [['Interest', 'interest'], ['Booking', 'booking'], ['Waitlist', 'waitlist']], 'interest', { readonly: true }),
      choice(
        'status',
        [['Received', 'received'], ['Place confirmed', 'confirmed'], ['Waitlist', 'waitlist'], ['Cancelled', 'cancelled']],
        'received',
      ),
      text('full_name'),
      text('email'),
      text('phone'),
      text('city'),
      text('country'),
      int('attendees'),
      long('accessibility_needs'),
      bool('accepted_terms', false, { readonly: true }),
      bool('marketing_opt_in', false, { readonly: true }),
      created,
    ],
  },
  {
    collection: 'applications',
    meta: {
      icon: 'assignment',
      note: 'Organiser proposals, speakers, local team and chapter partners. Nothing is approved or published until someone sets the status.',
    },
    schema: {},
    fields: [
      pk,
      choice(
        'type',
        [['Event organiser', 'organiser'], ['Speaker', 'speaker'], ['Local team', 'local_team'], ['Chapter partner', 'chapter_partner']],
        'organiser',
        { readonly: true },
      ),
      choice('status', [['Pending review', 'pending'], ['Approved', 'approved'], ['Rejected', 'rejected']], 'pending'),
      text('full_name'),
      text('email'),
      text('phone'),
      text('organisation'),
      text('city'),
      text('country'),
      // Organiser proposal
      text('event_title', { width: 'full' }),
      text('theme', { width: 'full' }),
      long('concept'),
      text('preferred_timeframe'),
      text('audience_size'),
      text('intended_audience', { width: 'full' }),
      choice('format', [['Speaker talks', 'speaker_talks'], ['Panel discussion', 'panel'], ['Community conversation', 'community_conversation'], ['Other', 'other']], null),
      long('suggested_speakers'),
      long('experience'),
      text('venue_availability', { width: 'full' }),
      long('budget'),
      long('links'),
      uuidRef('attachment', 'file', { note: 'Optional proposal document.' }),
      // Speaker
      text('topic', { width: 'full' }),
      long('bio'),
      text('sample_url', { width: 'full' }),
      // Local team
      long('skills'),
      text('availability'),
      // Chapter partner
      long('partnership_interest'),
      bool('accepted_privacy', false, { readonly: true }),
      bool('marketing_opt_in', false, { readonly: true }),
      long('review_notes', { note: 'Internal — never shown to the applicant.' }),
      created,
    ],
  },
];

const RELATIONS = [
  { collection: 'events', field: 'chapter', related_collection: 'chapters', schema: { on_delete: 'SET NULL' } },
  { collection: 'events', field: 'image', related_collection: 'directus_files', schema: { on_delete: 'SET NULL' } },
  { collection: 'event_registrations', field: 'event', related_collection: 'events', schema: { on_delete: 'SET NULL' } },
  { collection: 'applications', field: 'attachment', related_collection: 'directus_files', schema: { on_delete: 'SET NULL' } },
];

/* ───────────────────────────── launch content ───────────────────────────── */

const CHAPTERS = [
  { city: 'India', slug: 'india', status: 'coming_soon' },
  { city: 'Dubai', slug: 'dubai', status: 'coming_soon' },
];

const EVENTS = [
  {
    title: 'India: Upcoming Chapter Event',
    slug: 'india-upcoming-chapter-event',
    region: 'India',
    chapterSlug: 'india',
    blurb: 'New voices. Fresh perspectives. A conversation worth being part of.',
    timezone: 'Asia/Kolkata',
    sort: 1,
  },
  {
    title: 'Dubai: Upcoming Chapter Event',
    slug: 'dubai-upcoming-chapter-event',
    region: 'Dubai',
    city: 'Dubai',
    chapterSlug: 'dubai',
    blurb: 'A city of different backgrounds. A space for honest conversations.',
    timezone: 'Asia/Dubai',
    sort: 2,
  },
];

/* ───────────────────────────── main ───────────────────────────── */

console.log(`\n  AntiSocial Chapters setup for ${BASE}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  console.log('  --- collections ---');
  for (const def of COLLECTIONS) {
    try {
      await api(`/collections/${def.collection}`);
      console.log(`  = ${def.collection} exists`);
    } catch (err) {
      if (err.status !== 403 && err.status !== 404) throw err;
      await api('/collections', { method: 'POST', body: def });
      console.log(`  + ${def.collection} created`);
    }
  }

  console.log('\n  --- relations ---');
  for (const rel of RELATIONS) {
    try {
      await api(`/relations/${rel.collection}/${rel.field}`);
      console.log(`  = ${rel.collection}.${rel.field}`);
    } catch (err) {
      if (err.status !== 403 && err.status !== 404) throw err;
      await api('/relations', { method: 'POST', body: rel });
      console.log(`  + ${rel.collection}.${rel.field} -> ${rel.related_collection}`);
    }
  }

  console.log('\n  --- chapters ---');
  const chapterIds = {};
  for (const ch of CHAPTERS) {
    const found = (await api(`/items/chapters?filter=${q({ slug: { _eq: ch.slug } })}&fields=id&limit=1`))?.[0];
    if (found) {
      chapterIds[ch.slug] = found.id;
      console.log(`  = ${ch.city}`);
    } else {
      const made = await api('/items/chapters', { method: 'POST', body: ch });
      chapterIds[ch.slug] = made.id;
      console.log(`  + ${ch.city}`);
    }
  }

  console.log('\n  --- launch events ---');
  for (const { chapterSlug, ...ev } of EVENTS) {
    const found = (await api(`/items/events?filter=${q({ slug: { _eq: ev.slug } })}&fields=id&limit=1`))?.[0];
    if (found) {
      console.log(`  = ${ev.title}`);
      continue;
    }
    await api('/items/events', {
      method: 'POST',
      body: { ...ev, chapter: chapterIds[chapterSlug], status: 'coming_soon', visibility: 'published' },
    });
    console.log(`  + ${ev.title}  (Coming Soon, no date or venue)`);
  }

  console.log('\n  --- website permissions ---');
  const policy = (await api(`/policies?filter=${q({ name: { _eq: WEBSITE_POLICY } })}&fields=id&limit=1`))?.[0];
  if (!policy) {
    console.log('  ! website policy not found — run ../cms/scripts/create-site-token.mjs first, then re-run this.');
  } else {
    const existing = (await api(`/permissions?filter=${q({ policy: { _eq: policy.id } })}&fields=collection,action&limit=-1`)) || [];
    const have = new Set(existing.map((p) => `${p.collection}:${p.action}`));
    const wanted = [
      // Drafts stay invisible even to the site's own token.
      { collection: 'events', action: 'read', permissions: { visibility: { _eq: 'published' } } },
      { collection: 'event_registrations', action: 'create', permissions: {} },
      { collection: 'applications', action: 'create', permissions: {} },
      { collection: 'directus_files', action: 'create', permissions: {} },
    ].filter((p) => !have.has(`${p.collection}:${p.action}`));

    if (wanted.length) {
      await api('/permissions', {
        method: 'POST',
        body: wanted.map((p) => ({ ...p, policy: policy.id, fields: ['*'], validation: {} })),
      });
      for (const p of wanted) console.log(`  + ${p.action.padEnd(6)} ${p.collection}`);
    } else {
      console.log('  = already in place');
    }
  }

  console.log('\n  Done. India and Dubai show on /chapters as "Coming Soon" within a minute.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
