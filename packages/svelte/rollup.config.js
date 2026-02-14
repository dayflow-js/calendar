import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import svelte from 'rollup-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [
    svelte({
      preprocess: sveltePreprocess(),
      emitCss: false,
    }),
    resolve({
      browser: true,
      dedupe: ['svelte'],
      extensions: ['.mjs', '.js', '.ts', '.svelte'],
    }),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist',
    }),
    commonjs(),
    terser(),
  ],
  external: id =>
    id === 'svelte' || id.startsWith('svelte/') || id === '@dayflow/core',
  onwarn(warning, warn) {
    if (
      warning.code === 'CIRCULAR_DEPENDENCY' &&
      warning.ids &&
      warning.ids[0].includes('node_modules')
    ) {
      return;
    }
    warn(warning);
  },
};
