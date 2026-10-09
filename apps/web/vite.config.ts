import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

import { renderHeaders } from './scripts/securityHeaders.ts';

function securityHeaders(supabaseUrl: string | undefined): Plugin {
  return {
    name: 'concordia-security-headers',
    apply: 'build',
    writeBundle(options) {
      const file = join(options.dir ?? 'dist', '_headers');
      writeFileSync(file, renderHeaders(readFileSync(file, 'utf8'), supabaseUrl));
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), securityHeaders(loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL)],
  build: {
    target: 'es2023',
    sourcemap: 'hidden',
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'jsdom',
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_for_unit_tests',
    },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
}));
