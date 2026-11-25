#!/usr/bin/env node
/**
 * Two new events (19 Oct 2026):
 *
 *   AntiSocialTalks Davos, "Exclusively Unfiltered: Zurich", 17 Jan 2027,
 *     11:00 to 14:00, the day before Davos begins. By invitation (invites go
 *     out from Kapoor Wealth Partners); RSVP on the site, reviewed by the
 *     team. The venue is never named on the site: it is shared once an RSVP
 *     is confirmed. Planned to return every year.
 *   AntiSocialTalks San Francisco, January 2027, Coming Soon until the
 *     dates are fixed.
 *
 * CMS changes, only if missing:
 *   events.status              "RSVP Open" option
 *   event_registrations.kind   "RSVP" option
 *   event_registrations        organisation and job_title fields (asked on RSVPs)
 *   events                     the two events above (an existing one with the
 *                              same slug is left as it is, edits in the CMS win)
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/events-2026-10-19.mjs
 *
 * Safe to re-run.
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
  ['Registration Open', 'registration_open'],
  ['RSVP Open', 'rsvp_open'],
  ['Sold Out', 'sold_out'],
  ['Waitlist', 'waitlist'],
  ['Postponed', 'postponed'],
  ['Cancelled', 'cancelled'],
  ['Completed', 'completed'],
];

const REGISTRATION_KINDS = [
  ['Interest', 'interest'],
  ['Booking', 'booking'],
  ['RSVP', 'rsvp'],
  ['Waitlist', 'waitlist'],
];

const RSVP_FIELDS = [
  { field: 'organisation', type: 'string', meta: { interface: 'input', width: 'half', note: 'Asked on RSVPs for invitation events.' } },
  { field: 'job_title', type: 'string', meta: { interface: 'input', width: 'half', note: 'Role. Asked on RSVPs for invitation events.' } },
];

const EVENTS = [
  {
    title: 'Exclusively Unfiltered: Zurich',
    slug: 'davos-zurich-2027',
    visibility: 'published',
    status: 'rsvp_open',
    region: 'AntiSocialTalks Davos',
    city: 'Zurich',
    theme: 'An exclusive pre-Davos gathering for innovators and changemakers.',
    blurb: 'A daytime session in Zurich, the day before Davos begins. By invitation.',
    description:
      'Kapoor Wealth Partners and AntiSocialTalks invite you to an exclusive daytime session in Zurich, a strategic pitstop for global leaders before the evening assemblies begin in Davos. An unscripted panel challenges conventional thinking across business, technology and society. They called us AntiSocial. We decided to talk. Not anti-society. Anti-silence. AntiSocialTalks Davos will return every year.',
    audience: 'Strictly limited to 150–200 curated global changemakers.',
    starts_at: '2027-01-17T10:00:00.000Z', // 11:00 in Zurich (CET)
    timezone: 'Europe/Zurich',
    venue_name: 'Shared on RSVP confirmation',
    schedule: [
      '11:00 to 11:30 AM: Welcome and networking. Barista bar open, registration and guest assembly.',
      '11:30 to 11:45 AM: Opening address by Kapoor Wealth Partners and AntiSocialTalks.',
      '11:45 AM to 1:15 PM: Unscripted panel, The Rules Nobody Voted On. Creators, scientists and founders shifting global paradigms. Real stories over polished talking points.',
      '1:15 to 2:00 PM: Socially Unfiltered reception. Coffee, small bites and networking.',
      '2:00 PM: Departure, with transfers to the afternoon express trains to Davos Platz.',
    ].join('\n'),
    ticket_info:
      'By invitation only, and free to attend. Invitations come from Kapoor Wealth Partners, and an RSVP here is required. The venue is shared once your RSVP is confirmed.',
    accessibility_info:
      'Premium barista station, coffee, tea and light bites throughout. The session ends at 2:00 PM, in time for the afternoon trains: the 2:38 PM express from Zurich HB reaches Davos Platz at 4:53 PM, ahead of the evening keynotes and receptions. Tell us about any accessibility needs in your RSVP.',
    terms: 'Free to attend. If your plans change, let us know so the place can go to another guest.',
    contact_email: 'admin@antisocialtalks.com',
    capacity: 200,
    sort: 1,
  },
  {
    title: 'AntiSocialTalks San Francisco',
    slug: 'san-francisco-2027',
    visibility: 'published',
    status: 'coming_soon',
    region: 'USA',
    city: 'San Francisco',
    blurb: 'San Francisco, January 2027. Dates coming soon.',
    description:
      'AntiSocialTalks comes to San Francisco in January 2027. The date, the venue and the speakers are being confirmed. Register your interest to hear first.',
    timezone: 'America/Los_Angeles',
    contact_email: 'admin@antisocialtalks.com',
    sort: 3,
  },
];

console.log(`\n  New events for ${BASE}\n`);

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
  console.log('  + events.status: "RSVP Open" option');
  await api('/fields/event_registrations/kind', { method: 'PATCH', body: { meta: { options: choices(REGISTRATION_KINDS) } } });
  console.log('  + event_registrations.kind: "RSVP" option');

  for (const f of RSVP_FIELDS) {
    try {
      await api(`/fields/event_registrations/${f.field}`);
      console.log(`  = event_registrations.${f.field}`);
    } catch (err) {
      if (err.status !== 403 && err.status !== 404) throw err;
      await api('/fields/event_registrations', { method: 'POST', body: f });
      console.log(`  + event_registrations.${f.field}`);
    }
  }

  for (const ev of EVENTS) {
    const [found] = (await api(`/items/events?filter=${q({ slug: { _eq: ev.slug } })}&fields=id&limit=1`)) || [];
    if (found) {
      console.log(`  = ${ev.title} (already in the CMS, left as it is)`);
      continue;
    }
    await api('/items/events', { method: 'POST', body: ev });
    console.log(`  + ${ev.title}: /events/${ev.slug}`);
  }

  console.log('\n  Done. Both show on /events within a minute. Order them with the "sort" field.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
