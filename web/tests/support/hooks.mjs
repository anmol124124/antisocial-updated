// Module resolution for running src/ under Node's built-in TypeScript
// support: the `@/` alias, extensionless relative imports (.ts/.tsx), and
// stand-ins for the two Next.js-only modules the server code imports.
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const STUBS = {
  'server-only': new URL('./stubs/server-only.mjs', import.meta.url).href,
  'next/server': new URL('./stubs/next-server.mjs', import.meta.url).href,
};

function findFile(base) {
  for (const suffix of ['', '.ts', '.tsx', '.mjs', '.js', '/index.ts']) {
    const file = base + suffix;
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (STUBS[specifier] && !context.parentURL?.includes('/tests/support/stubs/')) {
    return { url: STUBS[specifier], shortCircuit: true };
  }
  let base = null;
  if (specifier.startsWith('@/')) base = path.join(SRC, specifier.slice(2));
  else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (base) {
    const file = findFile(base);
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

// The app's .ts files are ES modules; say so, rather than letting Node guess.
export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && url.endsWith('.ts') && url.includes('/src/')) {
    return nextLoad(url, { ...context, format: 'module-typescript' });
  }
  return nextLoad(url, context);
}
