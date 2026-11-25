#!/usr/bin/env node
/**
 * One command to get a local Directus from "container just started" to
 * "the website has content in it":
 *
 *   1. wait until Directus answers on http://localhost:8055
 *   2. log in as the local admin
 *   3. give that admin a static token and write it into web/.env.local,
 *      so the site can read the CMS without making anything public
 *   4. run ../cms/provision-schema.js   (hosts, episodes, guests, chapters, submissions)
 *   5. run ./seed-directus.mjs          (topics, shop_products + starter content)
 *
 *   npm run setup:local
 *
 * Safe to re-run. Nothing is deleted, and the token is only regenerated when
 * .env.local does not already have one.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(here, '..');
const envPath = resolve(webDir, '.env.local');

const BASE = process.env.DIRECTUS_URL || 'http://localhost:8055';
const EMAIL = process.env.DIRECTUS_EMAIL || 'admin@antisocialtalks.local';
const PASSWORD = process.env.DIRECTUS_PASSWORD || 'admin1234';

/* ───────────────────────────── helpers ───────────────────────────── */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDirectus(attempts = 40) {
  process.stdout.write(`  waiting for ${BASE} `);
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${BASE}/server/ping`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        console.log('- up\n');
        return true;
      }
    } catch {
      /* not up yet */
    }
    process.stdout.write('.');
    await sleep(3000);
  }
  console.log('\n');
  return false;
}

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(
      `Login failed (${res.status}). Expected ${EMAIL} / ${PASSWORD} — the values in ` +
        `cms/docker-compose.local.yml. If you changed them there, pass DIRECTUS_EMAIL and ` +
        `DIRECTUS_PASSWORD to this script.`,
    );
  }
  const { data } = await res.json();
  return data.access_token;
}

function readEnv() {
  try {
    return readFileSync(envPath, 'utf8');
  } catch {
    throw new Error(`web/.env.local not found. Copy .env.example to .env.local first.`);
  }
}

function currentToken(env) {
  const match = env.match(/^DIRECTUS_TOKEN=(.*)$/m);
  return match ? match[1].trim() : '';
}

/**
 * Static tokens let the site read the CMS without opening any collection to
 * the public — which is what you want locally, and a reasonable production
 * setup too (with a read-only user rather than the admin).
 */
async function ensureStaticToken(accessToken) {
  const env = readEnv();
  const existing = currentToken(env);
  if (existing) {
    console.log('  = DIRECTUS_TOKEN already set in .env.local, keeping it');
    return existing;
  }

  const token = `local-${crypto.randomUUID().replace(/-/g, '')}`;

  const res = await fetch(`${BASE}/users/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    throw new Error(`Could not set a static token (${res.status} ${await res.text()})`);
  }

  writeFileSync(envPath, env.replace(/^DIRECTUS_TOKEN=.*$/m, `DIRECTUS_TOKEN=${token}`), 'utf8');
  console.log('  + DIRECTUS_TOKEN written to web/.env.local');
  return token;
}

function run(script, cwd, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });
    child.on('close', (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${script} exited with code ${code}`)),
    );
  });
}

/* ────────────────────────────── main ─────────────────────────────── */

console.log('\n  AntiSocialTalks — local CMS setup\n');

if (!(await waitForDirectus())) {
  console.error(`  Directus never came up at ${BASE}.\n`);
  console.error('  Start it first:');
  console.error('    cd ../cms');
  console.error('    docker compose -f docker-compose.local.yml up -d');
  console.error('    docker compose -f docker-compose.local.yml logs -f directus\n');
  process.exit(1);
}

try {
  const accessToken = await login();
  console.log('  logged in as', EMAIL);

  await ensureStaticToken(accessToken);

  const childEnv = {
    DIRECTUS_URL: BASE,
    DIRECTUS_EMAIL: EMAIL,
    DIRECTUS_PASSWORD: PASSWORD,
    DIRECTUS_TOKEN: '', // the two scripts below log in themselves
  };

  console.log('\n  --- base schema (cms/provision-schema.js) ---\n');
  await run(resolve(webDir, '..', 'cms', 'provision-schema.js'), resolve(webDir, '..', 'cms'), childEnv);

  console.log('\n  --- website collections + seed content ---\n');
  await run(resolve(here, 'seed-directus.mjs'), webDir, childEnv);

  console.log('  Local CMS is ready.\n');
  console.log(`    Dashboard   ${BASE}   (${EMAIL} / ${PASSWORD})`);
  console.log('    Website     npm run dev   ->   http://localhost:3012\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
