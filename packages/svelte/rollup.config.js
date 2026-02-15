import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import esbuild from 'rollup-plugin-esbuild';
import svelte from 'rollup-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';

const createConfig = (ssr) => ({
  input: 'src/index.ts',
  output: [
    {
      file: ssr ? 'dist/index.ssr.js' : 'dist/index.js',
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [
    svelte({
      preprocess: sveltePreprocess(),
      emitCss: false,
      compilerOptions: {
        generate: ssr ? 'server' : 'client',
      },
    }),
    resolve({
      browser: !ssr,
      dedupe: ['svelte'],
      extensions: ['.mjs', '.js', '.ts', '.svelte'],
    }),
    esbuild({
      sourceMap: true,
      minify: false,
      target: 'esnext',
      loaders: {
        '.ts': 'ts',
      },
    }),
    commonjs(),
  ],
  external: (id) =>
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
});

export default [createConfig(false), createConfig(true)];
