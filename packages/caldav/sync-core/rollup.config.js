import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';

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
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
      }),
    ],
    external: ['@dayflow/core'],
  },
  {
    input: 'dist/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'es' }],
    // Map the tsconfig alias so its types are bundled; left alone, dts() treats
    // "@sync-core/..." as an external package and publishes an import that no
    // consumer can resolve.
    plugins: [
      dts({
        compilerOptions: {
          baseUrl: '.',
          paths: { '@sync-core/*': ['./dist/types/*'] },
        },
      }),
    ],
    external: ['@dayflow/core'],
  },
];
