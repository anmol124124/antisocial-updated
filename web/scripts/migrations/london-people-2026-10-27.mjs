#!/usr/bin/env node
/**
 * London (27 Oct 2026): Dr. Anmol Kapoor is the guest host, not the organiser,
 * and his title for the event is "Founder & CEO, Kapoor Wealth Partners".
 *
 * Changes only his entry in London's "people" (role, card credit, title, line
 * about him) and lists him after the host, Jessica Hillier. Everyone else,
 * BioAro's logo included, stays exactly as it is in the CMS. His Meet the
 * Voices profile is not changed.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/migrations/london-people-2026-10-27.mjs
 *
 * Safe to re-run.
 */

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;
const LONDON = 'london-2026';

const ANMOL = {
  role: 'Guest Host',
  credit: 'Guest host',
  voice: 'dr-anmol-kapoor',
  name: 'Dr. Anmol Kapoor',
  title: 'Founder & CEO, Kapoor Wealth Partners',
  bio: 'Joins Jessica as guest host for the afternoon.',
};

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
  if (!res.ok) throw new Error(`${method} ${path.split('?')[0]}: ${json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
  return json?.data;
}
const q = (o) => encodeURIComponent(JSON.stringify(o));

console.log(`\n  London people for ${BASE}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  const [london] = (await api(`/items/events?filter=${q({ slug: { _eq: LONDON } })}&fields=id,title,people&limit=1`)) || [];
  if (!london) throw new Error(`no event with the slug ${LONDON}`);
  const people = Array.isArray(london.people) ? london.people : [];

  const isAnmol = (p) => p?.voice === ANMOL.voice || /anmol/i.test(p?.name || '');
  const others = people.filter((p) => !isAnmol(p));
  const host = others.findIndex((p) => /^host$/i.test(String(p?.role || '').trim()));
  // Straight after the host; at the front if there is none.
  const next = [...others.slice(0, host + 1), ANMOL, ...others.slice(host + 1)];

  await api(`/items/events/${london.id}`, { method: 'PATCH', body: { people: next } });
  console.log(`  ~ ${london.title}: Dr. Anmol Kapoor is now "Guest Host", ${ANMOL.title}`);
  console.log(`    order: ${next.map((p) => `${p.name} (${p.role})`).join(', ')}`);
  console.log('\n  Done. The London page and the /events card show this within a minute.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
