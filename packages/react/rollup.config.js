import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

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
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        // Staged here, then bundled into dist/index.d.ts by the second build.
        declarationDir: 'dist/types',
      }),
      terser(),
    ],
    external: [
      'react',
      'react-dom',
      '@dayflow/core',
      'preact',
      'preact/hooks',
      'preact/compat',
    ],
  },
  // One bundled declaration file instead of per-module files. The unbundled
  // index.d.ts re-exported './DayFlowCalendar' without an extension, which
  // "type": "module" makes illegal under moduleResolution node16/nodenext:
  // those consumers saw no DayFlowCalendar export at all.
  {
    input: 'dist/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'es' }],
    plugins: [dts()],
    external: ['react', 'react-dom', '@dayflow/core', /^preact(\/|$)/],
  },
];
