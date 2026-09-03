import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/core/vitest.config.ts',
      'packages/react/vitest.config.ts',
      'packages/vue/vitest.config.ts',
      'packages/svelte/vitest.config.ts',
      'packages/plugins/drag/vitest.config.ts',
      'packages/caldav/core/vitest.config.ts',
      'packages/caldav/google-sync/vitest.config.ts',
      'packages/caldav/outlook-sync/vitest.config.ts',
      'packages/caldav/sync-core/vitest.config.ts',
    ],
  },
});
