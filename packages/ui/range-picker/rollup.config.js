import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { dts } from 'rollup-plugin-dts';

export default [
  {
    input: 'dist/build/index.js',
    output: [
      {
        file: 'dist/index.js',
        format: 'esm',
        sourcemap: false,
        exports: 'named',
      },
    ],
    plugins: [resolve({ extensions: ['.js', '.jsx'] }), commonjs()],
    external: ['preact', 'preact/hooks', 'preact/compat', 'temporal-polyfill'],
  },
  {
    input: 'dist/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'es' }],
    plugins: [dts()],
    external: ['temporal-polyfill'],
  },
];
