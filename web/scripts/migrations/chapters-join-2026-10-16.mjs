#!/usr/bin/env node
/**
 * Chapters and how everyone joins (brief of 15 Oct 2026): CMS changes for the
 * new forms and the review workflow. Adds to `applications`, only if missing:
 *
 *   type option      "Chapter founder" (Start a Chapter)
 *   status options   Pending review, In review, Contacted, Approved, Rejected
 *   founder fields   why_mission, team_type, team_details, chapter_plans, first_steps
 *   nomination       nomination_type, nominee_name, why_it_matters, spoken_before
 *   review           score (1 to 5), onboarding_stage (the six founder steps)
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/migrations/chapters-join-2026-10-16.mjs
 *
 * Safe to re-run. Existing applications keep their values.
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
    const err = new Error(`${method} ${path}: ${json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
    err.status = res.status;
    throw err;
  }
  return json?.data;
}

const choices = (list) => ({ choices: list.map(([text, value]) => ({ text, value })) });
const text = (field, meta = {}) => ({ field, type: 'string', meta: { interface: 'input', width: 'half', readonly: true, ...meta } });
const long = (field, meta = {}) => ({ field, type: 'text', meta: { interface: 'input-multiline', readonly: true, ...meta } });
const choice = (field, list, meta = {}) => ({
  field,
  type: 'string',
  meta: { interface: 'select-dropdown', display: 'labels', width: 'half', options: choices(list), ...meta },
});

const TYPES = [
  ['Chapter founder', 'chapter_founder'],
  ['Event organiser', 'organiser'],
  ['Speaker / nomination', 'speaker'],
  ['Local team / volunteer', 'local_team'],
  ['Chapter partner', 'chapter_partner'],
];

const STATUSES = [
  ['Pending review', 'pending'],
  ['In review', 'in_review'],
  ['Contacted', 'contacted'],
  ['Approved', 'approved'],
  ['Rejected', 'rejected'],
];

const FOUNDER_STEPS = [
  ['1. Expression of interest', 'interest'],
  ['2. Founder orientation', 'orientation'],
  ['3. Launch plan submitted', 'launch_plan'],
  ['4. Approval and terms', 'approval'],
  ['5. First event launched', 'first_event'],
  ['6. Growing the chapter', 'growing'],
];

const FIELDS = [
  // Start a Chapter: where (city, country already exist), why, who, what, how.
  long('why_mission', { note: 'Founder: why the mission matters to them.' }),
  choice('team_type', [['Alone, for now', 'alone'], ['With a founding team', 'founding_team']], { readonly: true }),
  long('team_details'),
  long('chapter_plans', { note: 'Founder: conversations and events they want to create.' }),
  long('first_steps', { note: 'Founder: speakers, venues, connections.' }),
  // Nominate a Voice (affiliation uses `organisation`, the idea uses `topic`).
  choice('nomination_type', [['Self-nomination', 'self'], ['Nominated by someone else', 'other']], { readonly: true }),
  text('nominee_name'),
  long('why_it_matters'),
  choice('spoken_before', [['Yes', 'yes'], ['No', 'no']], { readonly: true }),
  // Review.
  {
    field: 'score',
    type: 'integer',
    meta: { interface: 'slider', width: 'half', options: { minValue: 1, maxValue: 5, stepInterval: 1 }, note: 'Your assessment, 1 to 5.' },
  },
  choice('onboarding_stage', FOUNDER_STEPS, { note: 'Chapter founders only: where they are in the six steps.' }),
];

console.log(`\n  Chapters and joining: CMS update for ${BASE}\n`);

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
      await api(`/fields/applications/${f.field}`);
      console.log(`  = applications.${f.field}`);
    } catch (err) {
      if (err.status !== 403 && err.status !== 404) throw err;
      await api('/fields/applications', { method: 'POST', body: f });
      console.log(`  + applications.${f.field}`);
    }
  }

  await api('/fields/applications/type', { method: 'PATCH', body: { meta: { options: choices(TYPES) } } });
  console.log('  + type: "Chapter founder" option');
  await api('/fields/applications/status', {
    method: 'PATCH',
    body: { meta: { options: choices(STATUSES), note: 'Pending review, then In review, Contacted, and Approved or Rejected.' } },
  });
  console.log('  + status: In review and Contacted options');

  console.log('\n  Done. Filter applications by type and status to review them.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
