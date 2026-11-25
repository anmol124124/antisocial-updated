// Loaded with `node --import ./tests/support/register.mjs`: lets the tests
// import the app's TypeScript modules directly (see hooks.mjs).
import { register } from 'node:module';

if (!process.features.typescript) {
  console.error(`The tests load the app's TypeScript directly, which needs Node 22.18+ or 24 (this is ${process.version}).`);
  process.exit(1);
}

register('./hooks.mjs', import.meta.url);
