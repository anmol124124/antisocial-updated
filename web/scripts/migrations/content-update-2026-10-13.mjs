#!/usr/bin/env node
/**
 * Content update, 2026-10-13:
 *
 *   Chapters = the podcast city by city: Dubai, USA, India (in that order).
 *     Adds the USA chapter, a `sort` field, and plain one-line descriptions.
 *   Events   = meeting in person: the Dubai event (renamed "Dubai Event") and
 *     the Roadshow. The India event is moved to Draft (hidden, not deleted),
 *     since India is covered by the Roadshow.
 *   Episode 01 countdown to 14 October 2026, 00:00 India time.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/migrations/content-update-2026-10-13.mjs
 *
 * Safe to re-run.
 */

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;

/** 14 Oct 2026, midnight in India (UTC+5:30). Change in the CMS any time. */
const EPISODE_LAUNCH = '2026-10-13T18:30:00.000Z';

const CHAPTERS = [
  { slug: 'dubai', city: 'Dubai', sort: 1, theme: 'The podcast, recorded in Dubai.' },
  { slug: 'usa', city: 'USA', sort: 2, theme: 'The podcast, recorded in the USA.' },
  { slug: 'india', city: 'India', sort: 3, theme: 'The podcast, recorded across India.' },
];

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

console.log(`\n  Content update 2026-10-13 for ${BASE}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  /* Chapters */
  console.log('  --- chapters ---');
  try {
    await api('/fields/chapters/sort');
  } catch (err) {
    if (err.status !== 403 && err.status !== 404) throw err;
    await api('/fields/chapters', {
      method: 'POST',
      body: { field: 'sort', type: 'integer', meta: { interface: 'input', width: 'half', note: 'Order on the Chapters page (1 first).' } },
    });
    console.log('  + chapters.sort field');
  }
  for (const ch of CHAPTERS) {
    const found = (await api(`/items/chapters?filter=${q({ slug: { _eq: ch.slug } })}&fields=id&limit=1`))?.[0];
    if (found) {
      await api(`/items/chapters/${found.id}`, { method: 'PATCH', body: { city: ch.city, sort: ch.sort, theme: ch.theme } });
      console.log(`  ~ ${ch.city}`);
    } else {
      await api('/items/chapters', { method: 'POST', body: { ...ch, status: 'coming_soon' } });
      console.log(`  + ${ch.city}`);
    }
  }

  /* Events */
  console.log('\n  --- events ---');
  const dubai = (await api(`/items/events?filter=${q({ slug: { _eq: 'dubai-upcoming-chapter-event' } })}&fields=id&limit=1`))?.[0];
  if (dubai) {
    await api(`/items/events/${dubai.id}`, {
      method: 'PATCH',
      body: { title: 'Dubai Event', blurb: 'A live AntiSocialTalks evening in Dubai. Date and venue coming soon.' },
    });
    console.log('  ~ Dubai Event (address stays /events/dubai-upcoming-chapter-event)');
  } else {
    console.log('  ! Dubai event not found (slug dubai-upcoming-chapter-event)');
  }
  const india = (await api(`/items/events?filter=${q({ slug: { _eq: 'india-upcoming-chapter-event' } })}&fields=id&limit=1`))?.[0];
  if (india) {
    await api(`/items/events/${india.id}`, { method: 'PATCH', body: { visibility: 'draft' } });
    console.log('  ~ India event set to Draft (hidden; India is on the Roadshow)');
  }

  /* Episode 01 countdown */
  console.log('\n  --- episode countdown ---');
  const field = await api('/fields/episodes/publish_date');
  const value = field?.type === 'date' ? '2026-10-14' : EPISODE_LAUNCH;
  const episode = (await api(`/items/episodes?filter=${q({ title: { _starts_with: 'Episode 01' } })}&fields=id,title,status&limit=1`))?.[0];
  if (episode) {
    await api(`/items/episodes/${episode.id}`, { method: 'PATCH', body: { publish_date: value } });
    console.log(`  ~ ${episode.title}: publish_date ${value} (status stays "${episode.status}")`);
  } else {
    console.log('  ! Episode 01 not found');
  }

  console.log('\n  Done. Pages refresh within a minute.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
