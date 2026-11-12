import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(here, '../../core/src'),
      '@sidebar': resolve(here, './src'),
      '@dayflow/core': resolve(here, '../../core/src/index.ts'),
      '@dayflow/ui-context-menu': resolve(
        here,
        '../../ui/context-menu/src/index.ts'
      ),
      '@dayflow/ui-range-picker': resolve(
        here,
        '../../ui/range-picker/src/index.ts'
      ),
      '@ui-range-picker': resolve(here, '../../ui/range-picker/src'),
    },
  },
  test: {
    name: '@dayflow/plugin-sidebar',
    globals: true,
    environment: 'jsdom',
    setupFiles: [resolve(here, '../../core/src/setupTests.ts')],
    include: [resolve(here, 'src/**/*.{test,spec}.{ts,tsx}')],
  },
});
