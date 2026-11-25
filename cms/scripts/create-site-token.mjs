#!/usr/bin/env node
/**
 * Gives the website its own Directus identity: a policy, a user with that
 * policy, and a static token for DIRECTUS_TOKEN.
 *
 * The policy can READ the content collections and files, and CREATE
 * submissions. Nothing else — it cannot read submissions back, edit content,
 * or open the admin app.
 *
 * Why not the Public policy: requests that carry a token never receive Public
 * permissions in Directus, so "Public: create on submissions" does nothing for
 * a site that authenticates. Doing it on the site's own policy means nothing
 * in the CMS has to be public at all.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 \
 *   DIRECTUS_EMAIL=admin@example.com DIRECTUS_PASSWORD=... \
 *   node cms/scripts/create-site-token.mjs [path/to/write/token]
 *
 * Safe to re-run: the policy, its permissions and the user are reused, and
 * the token is rotated. The script finishes by proving the token can do what
 * the site needs and nothing more.
 */

import { randomBytes } from 'node:crypto';
import { writeFileSync, chmodSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;
const TOKEN_FILE = process.argv[2] || '';

// The policy and its permissions are defined once, in cms/schema/website-policy.json
// (cms/scripts/provision.mjs keeps them in step); this script adds any that are missing.
const WEBSITE = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'schema', 'website-policy.json'), 'utf8'));
const POLICY_NAME = WEBSITE.policy.name;
// The Directus user the website signs in as. Keep the same address on every run, or a second user is made.
const SITE_USER_EMAIL = process.env.SITE_USER_EMAIL || 'website@antisocialtalks.com';

if (!EMAIL || !PASSWORD) {
  console.error('\n  Set DIRECTUS_EMAIL and DIRECTUS_PASSWORD (the admin login).\n');
  process.exit(1);
}

let admin = '';

async function api(path, { method = 'GET', body, token = admin } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { status: res.status, ok: res.ok, json };
}

async function must(path, opts) {
  const r = await api(path, opts);
  if (!r.ok) {
    const msg = r.json?.errors?.[0]?.message || `HTTP ${r.status}`;
    throw new Error(`${opts?.method || 'GET'} ${path} failed: ${msg}`);
  }
  return r.json?.data;
}

const q = (filter) => encodeURIComponent(JSON.stringify(filter));

/* ──────────────────────────── steps ──────────────────────────── */

async function login() {
  const data = await must('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
    token: '',
  });
  admin = data.access_token;
  console.log('  logged in as admin');
}

async function ensurePolicy() {
  const found = await must(`/policies?filter=${q({ name: { _eq: POLICY_NAME } })}&limit=1`);
  if (found?.length) {
    console.log(`  = policy exists`);
    return found[0].id;
  }
  const created = await must('/policies', { method: 'POST', body: WEBSITE.policy });
  console.log(`  + policy created`);
  return created.id;
}

async function ensurePermissions(policyId) {
  const existing =
    (await must(`/permissions?filter=${q({ policy: { _eq: policyId } })}&limit=-1&fields=collection,action`)) || [];
  const have = new Set(existing.map((p) => `${p.collection}:${p.action}`));

  const wanted = WEBSITE.permissions.filter((p) => !have.has(`${p.collection}:${p.action}`));

  if (wanted.length === 0) {
    console.log('  = permissions already in place');
    return;
  }

  await must('/permissions', {
    method: 'POST',
    body: wanted.map((p) => ({ ...p, policy: policyId })),
  });
  for (const p of wanted) console.log(`  + ${p.action.padEnd(6)} ${p.collection}`);
}

async function ensureUser(policyId, token) {
  const found = await must(
    `/users?filter=${q({ email: { _eq: SITE_USER_EMAIL } })}&limit=1&fields=id,policies.policy`,
  );

  if (found?.length) {
    const user = found[0];
    const linked = (user.policies || []).some((a) => a.policy === policyId);
    await must(`/users/${user.id}`, {
      method: 'PATCH',
      body: {
        token,
        status: 'active',
        ...(linked ? {} : { policies: { create: [{ policy: policyId }], update: [], delete: [] } }),
      },
    });
    console.log(`  = user ${SITE_USER_EMAIL} exists — token rotated${linked ? '' : ', policy attached'}`);
    return user.id;
  }

  const created = await must('/users', {
    method: 'POST',
    body: {
      email: SITE_USER_EMAIL,
      first_name: 'Website',
      status: 'active',
      token,
      policies: { create: [{ policy: policyId }], update: [], delete: [] },
    },
  });
  console.log(`  + user ${SITE_USER_EMAIL} created`);
  return created.id;
}

/** Prove the token does exactly what the site needs — and not more. */
async function verify(token) {
  const checks = [];
  const check = (label, pass, detail = '') => {
    checks.push(pass);
    console.log(`  ${pass ? 'OK  ' : 'FAIL'} ${label}${detail ? `  (${detail})` : ''}`);
  };

  for (const c of ['guests', 'episodes', 'topics', 'chapters', 'events', 'site_settings', 'home_pillars', 'community_ways']) {
    const r = await api(`/items/${c}?limit=1`, { token });
    check(`read ${c}`, r.ok, `HTTP ${r.status}`);
  }

  const files = await api('/files?limit=1', { token });
  check('read files (images)', files.ok, `HTTP ${files.status}`);

  const created = await api('/items/submissions', {
    method: 'POST',
    token,
    body: { type: 'community', name: 'setup check', email: 'setup-check@example.com', message: 'automated permission check — safe to delete' },
  });
  check('create submission (forms)', created.ok, `HTTP ${created.status}`);

  // Clean the probe row up with the admin token — the site token cannot. It
  // has no read on submissions, so Directus answers the create with a bare
  // 204 and no id; find the row by its probe email instead.
  const probes =
    (await api(`/items/submissions?filter=${q({ email: { _eq: 'setup-check@example.com' } })}&fields=id&limit=-1`))
      .json?.data || [];
  for (const row of probes) await api(`/items/submissions/${row.id}`, { method: 'DELETE' });

  const leak = await api('/items/submissions?limit=1', { token });
  check('cannot read submissions back', !leak.ok, `HTTP ${leak.status}`);

  const edit = await api('/items/guests?limit=1', { method: 'POST', token, body: { name: 'should fail' } });
  check('cannot create guests', !edit.ok, `HTTP ${edit.status}`);

  return checks.every(Boolean);
}

/* ──────────────────────────── main ───────────────────────────── */

console.log(`\n  Website access for ${BASE}\n`);

try {
  await login();
  const policyId = await ensurePolicy();
  await ensurePermissions(policyId);

  const token = `site-${randomBytes(24).toString('hex')}`;
  await ensureUser(policyId, token);

  console.log('\n  --- verifying the token ---\n');
  const ok = await verify(token);

  if (!ok) {
    console.error('\n  Some checks failed — do not use this token yet. Paste this output.\n');
    process.exit(1);
  }

  if (TOKEN_FILE) {
    writeFileSync(TOKEN_FILE, `${token}\n`, 'utf8');
    chmodSync(TOKEN_FILE, 0o600);
    console.log(`\n  Token written to ${TOKEN_FILE} (readable by you only).`);
  } else {
    console.log(`\n  DIRECTUS_TOKEN=${token}`);
  }
  console.log('  All checks passed.\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
