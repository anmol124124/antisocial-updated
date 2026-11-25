#!/usr/bin/env node
/**
 * Events update (26 Oct 2026), for the new /events and event pages:
 *
 *   AntiSocialTalks London, 3 Nov 2026, 11:30 AM to 3:00 PM: a private,
 *     invite-only afternoon organised by Dr. Anmol Kapoor, hosted by Jessica,
 *     co-organised with BioAro (BioAro products for every guest). Invited
 *     guests get their RSVP link by email, so the page has no public form,
 *     only "Write to us".
 *   AntiSocialTalks Dubai, 11 Nov 2026 (time to be announced): early bird
 *     open, a main character not named yet, and what early bird guests get.
 *     Its address stays /events/dubai-upcoming-chapter-event.
 *
 * CMS changes:
 *   events.status   "Invite Only" and "Early Bird Open" options
 *   events          ends_at, people, perk, includes, teaser, highlights,
 *                   topics, pull_quote, featured (added if missing)
 *   events          London's and Dubai's details set
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/events-2026-10-26.mjs
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
const choices = (list) => ({ choices: list.map(([text, value]) => ({ text, value })) });

const EVENT_STATUSES = [
  ['Coming Soon', 'coming_soon'],
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

const json = (field, note) => ({ field, type: 'json', meta: { interface: 'input-code', options: { language: 'json' }, note } });
const lines = (field, note) => ({ field, type: 'text', meta: { interface: 'input-multiline', note } });

const FIELDS = [
  { field: 'ends_at', type: 'timestamp', meta: { interface: 'datetime', width: 'half', note: 'When it finishes, for "11:30 AM – 3:00 PM".' } },
  json('people', 'Who is behind it: [{ "role": "Organiser", "name": "…", "bio": "One or two lines" }]. Roles Organiser, Host and Partner read "Organised by", "Hosted by", "Co-organised with" on the card.'),
  { field: 'perk', type: 'string', meta: { interface: 'input', note: 'One line on what guests take home, e.g. "BioAro products will be shared with every guest on the day."' } },
  lines('includes', '"What you get" on the card, one per line.'),
  json('teaser', 'A guest kept secret for now: { "label": "The main character", "text": "Revealed soon. Early bird guests find out first." }'),
  json('highlights', 'Short cards on the event page: [{ "label": "The format", "title": "…", "text": "…" }]'),
  lines('topics', 'Subjects shown as tags on the event page, one per line.'),
  lines('pull_quote', 'The statement set large on the event page, one sentence per line; the last line is in the accent colour.'),
  { field: 'featured', type: 'boolean', schema: { default_value: false }, meta: { interface: 'boolean', width: 'half', note: 'Set apart on /events with the dark card.', options: { label: 'Featured' } } },
];

const LONDON_SLUG = 'london-2026';
const LONDON = {
  status: 'invite_only',
  starts_at: '2026-11-03T11:30:00.000Z', // 11:30 AM in London (GMT)
  ends_at: '2026-11-03T15:00:00.000Z',
  time_tba: false,
  theme: 'Big Questions. Bold Ideas. Deeper Conversations.',
  blurb: 'Big questions on health, ageing and human potential. An afternoon of unconventional thinking and conversations nobody scripted.',
  description: [
    'What happens when unconventional thinkers challenge everything we thought we knew about health, aging and human potential?',
    'AntiSocialTalks London is an afternoon of bold perspectives and thought-provoking conversations on longevity, AI, genomics, precision medicine and the future of healthcare. Expect a view of the future you have never heard before.',
  ].join('\n\n'),
  topics: ['Longevity', 'AI', 'Genomics', 'Precision medicine', 'Future of healthcare'].join('\n'),
  pull_quote: ['No conventional thinking.', 'No predictable answers.', 'Just conversations that challenge what’s possible.'].join('\n'),
  highlights: [
    {
      label: 'The format',
      title: 'Not your typical panel discussion',
      text: 'Forget slides and polite nodding. This is an afternoon built around real conversation, ideas that push back, and people who say what they actually think.',
    },
    {
      label: 'In the room',
      title: 'Goodies for every guest',
      text: 'We have prepared some amazing goodies for everyone attending, including BioAro products shared with every guest on the day.',
    },
  ],
  people: [
    { role: 'Organiser', name: 'Dr. Anmol Kapoor', bio: 'Brings the people and ideas together for London.' },
    { role: 'Host', name: 'Jessica', bio: 'Hosts the afternoon and keeps the conversation honest.' },
    { role: 'Co-organiser and partner', name: 'BioAro', bio: 'Co-organising London and sharing BioAro products with every guest on the day.' },
  ],
  perk: 'BioAro products will be shared with every guest on the day.',
  venue_name: 'Shared with invited guests',
  ticket_info: 'This is a private afternoon. Your RSVP link is sent personally by email to invited guests. Check your inbox and use your link to confirm your place.',
  contact_email: 'admin@antisocialtalks.com',
  featured: false,
  sort: 0,
};

const DUBAI_SLUG = 'dubai-upcoming-chapter-event';
const DUBAI = {
  status: 'early_bird',
  starts_at: '2026-11-11T08:00:00.000Z', // 11 Nov in Dubai; the time is still to be announced
  time_tba: true,
  theme: 'A full-on night. Zero small talk.',
  blurb: 'Bolder discussions, a room that says what it thinks, rewards and goodies for everyone through the door, and one main character we are not naming. Yet.',
  teaser: { label: 'The main character', text: 'Revealed soon. Early bird guests find out first.' },
  includes: ['Early bird ticket access', 'Rewards and goodies in the room', 'Bolder discussions, no small talk'].join('\n'),
  pull_quote: ['Anti-Social.', 'Not Anti-Opinion.'].join('\n'),
  ticket_info: 'After you register, we email you shortly with all the details.',
  featured: true,
  sort: 1,
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

  await api('/fields/events/status', { method: 'PATCH', body: { meta: { options: choices(EVENT_STATUSES) } } });
  console.log('  + events.status: "Invite Only" and "Early Bird Open" options');

  for (const f of FIELDS) {
    try {
      await api(`/fields/events/${f.field}`);
      console.log(`  = events.${f.field}`);
    } catch (err) {
      if (err.status !== 403 && err.status !== 404) throw err;
      await api('/fields/events', { method: 'POST', body: f });
      console.log(`  + events.${f.field}`);
    }
  }

  for (const [slug, data, name] of [
    [LONDON_SLUG, LONDON, 'AntiSocialTalks London'],
    [DUBAI_SLUG, DUBAI, 'AntiSocialTalks Dubai'],
  ]) {
    const [row] = (await api(`/items/events?filter=${q({ slug: { _eq: slug } })}&fields=id&limit=1`)) || [];
    if (!row) throw new Error(`no event with the slug ${slug}: run scripts/events-2026-10-25.mjs first`);
    await api(`/items/events/${row.id}`, { method: 'PATCH', body: data });
    console.log(`  ~ ${name}: details updated, /events/${slug}`);
  }

  console.log('\n  Done. The events pages show this within a minute.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
