import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import terser from '@rollup/plugin-terser';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: false,
      exports: 'named',
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: false,
      exports: 'named',
    },
  ],
  plugins: [
    peerDepsExternal(),
    resolve({
      browser: true,
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      alias: {
        '@': path.resolve('./src'),
      },
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.build.json',
      declaration: true,
      declarationDir: 'dist',
      exclude: [
        'src/app/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
      ],
    }),
    postcss({
      extensions: ['.css'],
      minimize: false,
      inject: false,
      extract: 'styles.css',
      config: {
        path: './postcss.build.js',
      },
      use: {
        sass: false,
        stylus: false,
        less: false,
      },
    }),
    terser(),
    visualizer({
      filename: 'bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ],
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'lucide-react',
    'temporal-polyfill',
    'tslib',
    '@dayflow/blossom-color-picker',
  ],
};
