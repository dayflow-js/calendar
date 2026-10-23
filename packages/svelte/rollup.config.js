import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';
import svelte from 'rollup-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';

const createConfig = ssr => ({
  input: 'src/index.ts',
  output: [
    {
      file: ssr ? 'dist/index.ssr.js' : 'dist/index.js',
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [
    // Before svelte(): rune modules (*.svelte.ts) must be plain JS by the time
    // the Svelte compiler sees them. It only strips types inside components.
    esbuild({
      sourceMap: true,
      minify: false,
      target: 'esnext',
      loaders: {
        '.ts': 'ts',
      },
    }),
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
    commonjs(),
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
    // Server output drops $effect bodies, so helpers used only inside them
    // (such as untrack) are unused there. Rollup already removes the import.
    if (
      ssr &&
      warning.code === 'UNUSED_EXTERNAL_IMPORT' &&
      (warning.exporter === 'svelte' || warning.exporter?.startsWith('svelte/'))
    ) {
      return;
    }
    warn(warning);
  },
});

export default [createConfig(false), createConfig(true)];
