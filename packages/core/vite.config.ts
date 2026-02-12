import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

const workspaceRoot = resolve(__dirname, '../../');

export default defineConfig({
  plugins: [preact({ reactAliasesEnabled: false })],
  root: workspaceRoot,
  publicDir: resolve(__dirname, 'public'),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@dayflow/core': resolve(__dirname, 'src/index.ts'),
      '@dayflow/react': resolve(__dirname, '../react/src/index.ts'),
      'preact/hooks': resolve(workspaceRoot, 'node_modules/preact/hooks'),
      'preact/compat': resolve(workspaceRoot, 'node_modules/preact/compat'),
      'preact/jsx-runtime': resolve(workspaceRoot, 'node_modules/preact/jsx-runtime'),
      'preact/jsx-dev-runtime': resolve(workspaceRoot, 'node_modules/preact/jsx-runtime'), // Preact usually uses same for dev
      'preact/debug': resolve(workspaceRoot, 'node_modules/preact/debug'),
      'preact': resolve(workspaceRoot, 'node_modules/preact'),
      'react': resolve(workspaceRoot, 'node_modules/preact/compat'),
      'react-dom': resolve(workspaceRoot, 'node_modules/preact/compat'),
      'react/jsx-runtime': resolve(workspaceRoot, 'node_modules/preact/compat/jsx-runtime')
    },
  },
  server: {
    port: 5529,
    open: '/packages/core/index.html',
    fs: {
      allow: [workspaceRoot],
    },
  },
});
