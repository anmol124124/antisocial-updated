import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  // Applied history; kept as it ran (see scripts/migrations/README.md).
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'scripts/migrations/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // App Router: fonts linked in the root layout load on every page; the rule is for pages/_document.
    rules: { '@next/next/no-page-custom-font': 'off' },
  },
  {
    // Node scripts, not React: a helper named `use` is not a hook.
    files: ['scripts/**', 'tests/**'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    // CommonJS config files (pm2).
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
];

export default config;
