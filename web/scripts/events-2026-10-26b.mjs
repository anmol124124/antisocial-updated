#!/usr/bin/env node
/**
 * Events update (26 Oct 2026, second part): the Dubai and Zurich pages, from
 * the mockups.
 *
 *   AntiSocialTalks Dubai: "AntiSocialTalks comes to DUBAI", a live talk show
 *     (talk show, music, food, games, merch), what's in the room, the main
 *     character still secret, early bird registration.
 *   Exclusively Unfiltered: Zurich: presented by Kapoor Wealth Partners ×
 *     AntiSocialTalks, 11:00 AM to 2:00 PM, for innovators and changemakers,
 *     RSVP as "Reserve Your Spot". The venue is still not named.
 *   AntiSocialTalks London: the country, for "London, UK".
 *
 * CMS changes:
 *   events   kicker, headline, presented_by, format, experience, country,
 *            in_the_room, closing, cta_label (added if missing)
 *   events   Dubai's, Zurich's and London's details set
 *
 * Run after scripts/events-2026-10-26.mjs (running that one again afterwards
 * would put Dubai's earlier statement back).
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/events-2026-10-26b.mjs
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
const line = (field, note, width = 'half') => ({ field, type: 'string', meta: { interface: 'input', width, note } });
const lines = (field, note) => ({ field, type: 'text', meta: { interface: 'input-multiline', note } });

const FIELDS = [
  line('kicker', 'The short line above the title on the event page, e.g. "AntiSocialTalks comes to".'),
  line('headline', 'A short word set very large at the top of the event page instead of the title, e.g. "Dubai". Leave empty to use the title.'),
  line('presented_by', 'Shown as a tag and in the details, e.g. "Kapoor Wealth Partners × AntiSocialTalks".'),
  line('format', 'The kind of event, shown as a tag, e.g. "Live talk show".'),
  line('experience', 'What it includes, shown in the key facts and the details, e.g. "Talk show · Music · Food".', 'full'),
  line('country', 'Shown after the city, e.g. "UAE" for "Dubai, UAE".'),
  lines('in_the_room', '"What\'s in the room" on the event page, one per line; the last line is set apart.'),
  lines('closing', 'The closing line of the event page, one line each; the last line is in the accent colour. Empty: "Think differently. Speak freely. Change the world."'),
  line('cta_label', 'The register button and heading, e.g. "Reserve Your Spot". Empty: worded by the status.'),
];

const UPDATES = [
  [
    'dubai-upcoming-chapter-event',
    'AntiSocialTalks Dubai',
    {
      kicker: 'AntiSocialTalks comes to',
      headline: 'Dubai',
      format: 'Live talk show',
      theme: 'Anti-Social. Not Anti-Opinion.',
      country: 'UAE',
      experience: 'Live talk show · Conversations · Music · Food · Games · Merch',
      venue_name: 'Shared by email after you reserve',
      description: [
        'Dubai, get ready for conversations you weren’t expecting.',
        'What happens when bold personalities, unconventional thinkers and unapologetically honest voices come together in one room?',
        'Welcome to AntiSocialTalks Dubai, a live talk-show experience where opinions aren’t filtered, perspectives are challenged, and the most interesting conversations happen when people stop playing it safe.',
      ].join('\n\n'),
      pull_quote: [
        'This isn’t a corporate networking event.',
        'No rehearsed speeches. No predictable introductions.',
        '',
        'It’s a night built around real people, real opinions and real conversations.',
      ].join('\n'),
      in_the_room: [
        'Live talk show',
        'Music',
        'Food',
        'Merchandise corner',
        'Picture spots you’ll never forget',
        'Loads of games',
        'Become an AntiSocial gang member',
      ].join('\n'),
      teaser: {
        label: 'The main character',
        title: 'Every night has one. We’re not saying who.',
        text: 'Revealed closer to the night. Early bird guests find out first.',
      },
      ticket_info: 'Reserve now and we’ll email you shortly with all the details. Rewards and goodies are waiting in the room.',
      schedule: null,
      closing: null,
      cta_label: null,
    },
  ],
  [
    'davos-zurich-2027',
    'Exclusively Unfiltered: Zurich',
    {
      kicker: 'An exclusive pre-Davos gathering',
      presented_by: 'Kapoor Wealth Partners × AntiSocialTalks',
      theme: 'For innovators and changemakers',
      country: 'Switzerland',
      ends_at: '2027-01-17T13:00:00.000Z', // 2:00 PM in Zurich (CET)
      description: [
        'A strategic pitstop for global leaders, before the evening assemblies begin in Davos.',
        'Kapoor Wealth Partners cordially invites you to an exclusive daytime session of AntiSocialTalks in Zurich. This unscripted panel discussion challenges conventional thinking across business, technology and society.',
        'Timed for an easy afternoon transit to Davos.',
      ].join('\n\n'),
      topics: ['Business', 'Technology', 'Society'].join('\n'),
      pull_quote: ['They called us AntiSocial.', 'We decided to talk.', 'Not anti-society. Anti-silence.'].join('\n'),
      ticket_info: 'Reserve your place and we’ll email you with the details. The venue is shared once your RSVP is confirmed.',
      cta_label: 'Reserve Your Spot',
      closing: ['Challenge conventional', 'thinking.'].join('\n'),
    },
  ],
  ['london-2026', 'AntiSocialTalks London', { country: 'UK' }],
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

  for (const [slug, name, data] of UPDATES) {
    const [row] = (await api(`/items/events?filter=${q({ slug: { _eq: slug } })}&fields=id&limit=1`)) || [];
    if (!row) throw new Error(`no event with the slug ${slug}`);
    await api(`/items/events/${row.id}`, { method: 'PATCH', body: data });
    console.log(`  ~ ${name}: details updated, /events/${slug}`);
  }

  console.log('\n  Done. The event pages show this within a minute.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
