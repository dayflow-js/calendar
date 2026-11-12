import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import vue from 'rollup-plugin-vue';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'esm',
        sourcemap: false,
        exports: 'named',
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve({
        extensions: ['.js', '.ts', '.vue'],
      }),
      vue(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        // Staged here, then bundled into dist/index.d.ts by the second build.
        declarationDir: 'dist/types',
      }),
      commonjs(),
      terser(),
    ],
    external: ['vue', '@dayflow/core'],
  },
  // One bundled declaration file instead of per-module files. The unbundled
  // index.d.ts re-exported './DayFlowCalendar' without an extension, which
  // "type": "module" makes illegal under moduleResolution node16/nodenext:
  // those consumers saw no DayFlowCalendar export at all.
  {
    input: 'dist/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'es' }],
    plugins: [dts()],
    external: ['vue', '@dayflow/core'],
  },
];
