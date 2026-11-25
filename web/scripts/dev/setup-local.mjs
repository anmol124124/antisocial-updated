#!/usr/bin/env node
/**
 * One command from "local Directus just started" to "the website has content":
 *
 *   1. wait until Directus answers (DIRECTUS_URL, default http://localhost:8055)
 *   2. cms/scripts/provision.mjs          schema, website permissions, site content
 *   3. scripts/dev/seed-starter-content   a few topics, guests, an episode, a chapter
 *   4. cms/scripts/create-site-token.mjs  the website's own least-privilege token,
 *                                         written into web/.env.local as DIRECTUS_TOKEN
 *
 *   npm run cms:up && npm run setup:local
 *
 * Safe to re-run. Nothing is deleted, and the token is only made when .env.local
 * does not have one yet. The admin login is the one in cms/docker-compose.local.yml;
 * pass DIRECTUS_EMAIL / DIRECTUS_PASSWORD if you changed it.
 */

import { existsSync, copyFileSync, readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { CMS_DIR, ENV_LOCAL, WEB_DIR } from '../lib/paths.mjs';

const BASE = (process.env.DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL || 'admin@example.com';
const PASSWORD = process.env.DIRECTUS_PASSWORD || 'admin1234';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDirectus(attempts = 40) {
  process.stdout.write(`  waiting for ${BASE} `);
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${BASE}/server/ping`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return console.log('- up\n'), true;
    } catch {
      /* not up yet */
    }
    process.stdout.write('.');
    await sleep(3000);
  }
  return console.log(' - gave up\n'), false;
}

function run(script, args = []) {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: WEB_DIR,
      env: { ...process.env, DIRECTUS_URL: BASE, DIRECTUS_EMAIL: EMAIL, DIRECTUS_PASSWORD: PASSWORD },
      stdio: 'inherit',
    });
    child.on('close', (code) => (code === 0 ? done() : fail(new Error(`${script} exited with code ${code}`))));
  });
}

function envLocal() {
  if (!existsSync(ENV_LOCAL)) {
    copyFileSync(resolve(WEB_DIR, '.env.example'), ENV_LOCAL);
    console.log('  + web/.env.local created from .env.example\n');
  }
  return readFileSync(ENV_LOCAL, 'utf8');
}

console.log('\n  AntiSocialTalks — local CMS setup\n');

if (!(await waitForDirectus())) {
  console.error(`  Directus never came up at ${BASE}. Start it first:  npm run cms:up\n`);
  process.exit(1);
}

try {
  await run(resolve(CMS_DIR, 'scripts', 'provision.mjs'));
  await run(resolve(WEB_DIR, 'scripts', 'dev', 'seed-starter-content.mjs'));

  const env = envLocal();
  if (/^DIRECTUS_TOKEN=\S+/m.test(env)) {
    console.log('  = DIRECTUS_TOKEN already set in web/.env.local, keeping it');
  } else {
    const dir = mkdtempSync(join(tmpdir(), 'ast-token-'));
    try {
      await run(resolve(CMS_DIR, 'scripts', 'create-site-token.mjs'), [join(dir, 'token')]);
      const token = readFileSync(join(dir, 'token'), 'utf8').trim();
      const next = /^DIRECTUS_TOKEN=/m.test(env) ? env.replace(/^DIRECTUS_TOKEN=.*$/m, `DIRECTUS_TOKEN=${token}`) : `${env.trimEnd()}\nDIRECTUS_TOKEN=${token}\n`;
      writeFileSync(ENV_LOCAL, next, 'utf8');
      console.log('  + DIRECTUS_TOKEN written to web/.env.local');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  console.log('\n  Local CMS is ready.');
  console.log(`    Dashboard   ${BASE}   (${EMAIL})`);
  console.log('    Website     npm run dev   ->   http://localhost:3012\n');
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
