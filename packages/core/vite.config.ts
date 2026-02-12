import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

// 这里的 __dirname 是 packages/core
const workspaceRoot = resolve(__dirname, '../../');

export default defineConfig({
  plugins: [preact()],
  // 必须指向 Monorepo 根目录，才能解析 /examples/main.tsx
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
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/compat/jsx-runtime'
    },
  },
  server: {
    port: 5529,
    // 告诉 Vite 启动时打开哪个 HTML
    open: '/packages/core/index.html',
    fs: {
      // 允许访问整个 workspace
      allow: [workspaceRoot],
    },
  },
});
