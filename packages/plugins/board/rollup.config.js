import resolve from '@rollup/plugin-node-resolve';
import { dts } from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';

const external = id =>
  id === '@dayflow/core' ||
  id === '@dayflow/blossom-color-picker' ||
  id.startsWith('preact') ||
  id === 'temporal-polyfill';

export default [
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.js', format: 'esm' },
    plugins: [
      resolve(),
      esbuild({
        target: 'es2018',
        jsx: 'automatic',
        jsxImportSource: 'preact',
      }),
    ],
    external,
  },
  {
    input: 'dist/types/index.d.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [dts()],
    external,
  },
];
