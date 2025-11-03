import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import { terser } from 'rollup-plugin-terser';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
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
      minimize: true,
      inject: false,
      extract: 'styles.css',
    }),
    terser(),
    visualizer({
      filename: 'bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // 使用树状图显示
    }),
  ],
  external: ['react', 'react-dom', 'react/jsx-runtime'],
};
