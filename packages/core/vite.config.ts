import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import preactPlugin from '@preact/preset-vite';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '../../');

export default defineConfig({
  plugins: [preactPlugin({ reactAliasesEnabled: false })],
  root: workspaceRoot,
  publicDir: resolve(__dirname, 'public'),
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '@drag', replacement: resolve(__dirname, '../plugins/drag/src') },
      {
        find: '@sidebar',
        replacement: resolve(__dirname, '../plugins/sidebar/src'),
      },
      {
        find: '@keyboard-shortcuts',
        replacement: resolve(__dirname, '../plugins/keyboard-shortcuts/src'),
      },
      {
        find: '@localization',
        replacement: resolve(__dirname, '../plugins/localization/src'),
      },
      {
        find: '@dayflow/ui-context-menu',
        replacement: resolve(__dirname, '../ui/context-menu/src/index.ts'),
      },
      {
        find: '@dayflow/ui-range-picker',
        replacement: resolve(__dirname, '../ui/range-picker/src/index.ts'),
      },
      {
        find: '@ui-range-picker',
        replacement: resolve(__dirname, '../ui/range-picker/src'),
      },
      {
        find: '@dayflow/core',
        replacement: resolve(__dirname, 'src/index.ts'),
      },
      {
        find: '@dayflow/react',
        replacement: resolve(__dirname, '../react/src/index.ts'),
      },
      { find: '@examples', replacement: resolve(__dirname, '../../examples') },
      {
        find: '@dayflow/plugin-sidebar',
        replacement: resolve(__dirname, '../plugins/sidebar/src/index.ts'),
      },
      {
        find: '@dayflow/plugin-keyboard-shortcuts',
        replacement: resolve(
          __dirname,
          '../plugins/keyboard-shortcuts/src/index.ts'
        ),
      },
      {
        find: '@dayflow/plugin-print',
        replacement: resolve(__dirname, '../plugins/print/src/index.ts'),
      },
      {
        find: '@print',
        replacement: resolve(__dirname, '../plugins/print/src'),
      },
      {
        find: '@dayflow/plugin-drag',
        replacement: resolve(__dirname, '../plugins/drag/src/index.ts'),
      },
      {
        find: '@dayflow/plugin-localization',
        replacement: resolve(__dirname, '../plugins/localization/src/index.ts'),
      },
      // specific CSS aliases FIRST
      {
        find: '@dayflow/resource-grid/dist/styles.css',
        replacement: resolve(
          __dirname,
          '../resource-grid/src/styles/tailwind-components.css'
        ),
      },
      {
        find: '@grid/styles.css',
        replacement: resolve(
          __dirname,
          '../resource-grid/src/styles/tailwind-components.css'
        ),
      },
      // Then general ones
      {
        find: '@dayflow/resource-grid',
        replacement: resolve(__dirname, '../resource-grid/src/index.ts'),
      },
      {
        find: '@grid',
        replacement: resolve(__dirname, '../resource-grid/src'),
      },
      {
        find: 'preact/hooks',
        replacement: resolve(workspaceRoot, 'node_modules/preact/hooks'),
      },
      {
        find: 'preact/compat',
        replacement: resolve(workspaceRoot, 'node_modules/preact/compat'),
      },
      {
        find: 'preact/jsx-runtime',
        replacement: resolve(workspaceRoot, 'node_modules/preact/jsx-runtime'),
      },
      {
        find: 'preact/jsx-dev-runtime',
        replacement: resolve(workspaceRoot, 'node_modules/preact/jsx-runtime'),
      }, // Preact usually uses same for dev
      {
        find: 'preact/debug',
        replacement: resolve(workspaceRoot, 'node_modules/preact/debug'),
      },
      {
        find: 'preact',
        replacement: resolve(workspaceRoot, 'node_modules/preact'),
      },
      {
        find: 'react',
        replacement: resolve(workspaceRoot, 'node_modules/preact/compat'),
      },
      {
        find: 'react-dom',
        replacement: resolve(workspaceRoot, 'node_modules/preact/compat'),
      },
      {
        find: 'react/jsx-runtime',
        replacement: resolve(
          workspaceRoot,
          'node_modules/preact/compat/jsx-runtime'
        ),
      },
    ],
  },
  server: {
    port: 5529,
    open: true,
    fs: {
      allow: [workspaceRoot],
    },
  },
});
