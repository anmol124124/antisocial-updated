/**
 * Where things live, for the scripts in web/scripts/<group>/.
 * One place, so moving a folder never means editing a dozen relative paths.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** web/ — the Next.js app (holds .env.local). */
export const WEB_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/** The repository root. */
export const REPO_DIR = resolve(WEB_DIR, '..');
/** Source artwork that is uploaded to the CMS, never served from the app: assets/merch, assets/events. */
export const ASSETS_DIR = resolve(REPO_DIR, 'assets');
/** cms/ — Directus compose files, schema and setup scripts. */
export const CMS_DIR = resolve(REPO_DIR, 'cms');
/** web/.env.local */
export const ENV_LOCAL = resolve(WEB_DIR, '.env.local');
