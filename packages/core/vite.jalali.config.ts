import { resolve } from 'node:path';

import { defineConfig, mergeConfig } from 'vite';

import baseConfig from './vite.config';

const entry = resolve(import.meta.dirname, '../../jalali.html');

export default mergeConfig(
  baseConfig,
  defineConfig({
    optimizeDeps: { entries: [entry] },
    build: { rollupOptions: { input: entry } },
  })
);
