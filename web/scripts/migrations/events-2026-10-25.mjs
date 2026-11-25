#!/usr/bin/env node
/**
 * Events update (25 Oct 2026):
 *
 *   AntiSocialTalks London, 3 Nov 2026: new. Health, aging and human
 *     potential: longevity, AI, genomics, precision medicine. The venue and the
 *     start time are coming soon, so the page shows the date and
 *     "Time to be announced". Coming Soon (register interest) for now.
 *   AntiSocialTalks Dubai: the existing Dubai event gets its full details
 *     (live talk show with conversations, music and food). Its address stays
 *     /events/dubai-upcoming-chapter-event so shared links keep working.
 *
 * CMS changes:
 *   events.time_tba   "Time to be announced" switch, added if missing
 *   events            London added (or its details refreshed); Dubai's details set
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/migrations/events-2026-10-25.mjs
 *
 * Safe to re-run; re-running puts these details back over edits made in the CMS.
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

const TIME_TBA = {
  field: 'time_tba',
  type: 'boolean',
  schema: { default_value: false },
  meta: {
    interface: 'boolean',
    width: 'half',
    note: 'The date is set but not the start time: the page shows the date and "Time to be announced".',
    options: { label: 'Time to be announced' },
  },
};

// A blank line in a description starts a new paragraph on the page.
const LONDON = {
  title: 'AntiSocialTalks London',
  slug: 'london-2026',
  visibility: 'published',
  status: 'coming_soon',
  region: 'UK',
  city: 'London',
  theme: 'Big Questions. Bold Ideas. Deeper Conversations.',
  blurb: 'Big questions on health, aging and human potential. 3 November, London.',
  description: [
    'What happens when unconventional thinkers challenge everything we thought we knew about health, aging, and human potential?',
    'Join AntiSocialTalks London for an evening of bold perspectives and thought-provoking conversations exploring longevity, AI, genomics, precision medicine, and the future of healthcare.',
    'No conventional thinking. No predictable answers. Just conversations that challenge what’s possible.',
    'Think differently. Speak freely. Change the world.',
  ].join('\n\n'),
  starts_at: '2026-11-03T00:00:00.000Z', // the date only; the time is still to be announced
  time_tba: true,
  timezone: 'Europe/London',
  venue_name: null,
  contact_email: 'admin@antisocialtalks.com',
  sort: 0, // the soonest event, first on /events
};

const DUBAI_SLUG = 'dubai-upcoming-chapter-event';
const DUBAI = {
  title: 'AntiSocialTalks Dubai',
  status: 'coming_soon',
  region: 'Dubai',
  city: 'Dubai',
  theme: 'Anti-Social. Not Anti-Opinion.',
  blurb: 'A live talk show in Dubai, with conversations, music and food. Details coming soon.',
  description: [
    'Dubai, get ready for conversations you weren’t expecting.',
    'What happens when bold personalities, unconventional thinkers, and unapologetically honest voices come together in one room?',
    'Welcome to AntiSocialTalks Dubai, a live talk-show experience where opinions aren’t filtered, perspectives are challenged, and the most interesting conversations happen when people stop playing it safe.',
    'This isn’t any corporate networking event. It’s not another room full of rehearsed speeches or predictable introductions. It’s a night built around real people, real opinions, and real conversations.',
    'Think differently. Speak freely. Change the world.',
  ].join('\n\n'),
  schedule: ['Live talk show', 'Conversations', 'Music', 'Food'].join('\n'),
  starts_at: null,
  time_tba: false,
  timezone: 'Asia/Dubai',
  venue_name: null,
  contact_email: 'admin@antisocialtalks.com',
};

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

  try {
    await api('/fields/events/time_tba');
    console.log('  = events.time_tba');
  } catch (err) {
    if (err.status !== 403 && err.status !== 404) throw err;
    await api('/fields/events', { method: 'POST', body: TIME_TBA });
    console.log('  + events.time_tba ("Time to be announced")');
  }

  const [london] = (await api(`/items/events?filter=${q({ slug: { _eq: LONDON.slug } })}&fields=id&limit=1`)) || [];
  if (london) {
    await api(`/items/events/${london.id}`, { method: 'PATCH', body: LONDON });
    console.log(`  ~ ${LONDON.title}: details refreshed, /events/${LONDON.slug}`);
  } else {
    await api('/items/events', { method: 'POST', body: LONDON });
    console.log(`  + ${LONDON.title}: /events/${LONDON.slug}`);
  }

  const [dubai] = (await api(`/items/events?filter=${q({ slug: { _eq: DUBAI_SLUG } })}&fields=id,title&limit=1`)) || [];
  if (!dubai) throw new Error(`no event with the slug ${DUBAI_SLUG}: is it the right CMS?`);
  await api(`/items/events/${dubai.id}`, { method: 'PATCH', body: DUBAI });
  console.log(`  ~ ${dubai.title} -> ${DUBAI.title}: details updated, /events/${DUBAI_SLUG}`);

  console.log('\n  Done. Both show on /events within a minute.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
