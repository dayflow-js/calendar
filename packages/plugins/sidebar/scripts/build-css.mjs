import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import postcssImport from 'postcss-import';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function buildCss(inputFile, outputFile) {
  const input = path.join(root, inputFile);
  const output = path.join(root, outputFile);

  const css = await fs.readFile(input, 'utf8');

  const result = await postcss([
    postcssImport(),
    tailwindcss,
    autoprefixer,
  ]).process(css, { from: input, to: output });

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, result.css);

  if (result.map) {
    await fs.writeFile(`${output}.map`, result.map.toString());
  }

  console.log('CSS built successfully ->', path.relative(root, output));
}

await buildCss('src/styles/tailwind.css', 'dist/styles.css');
await buildCss(
  'src/styles/tailwind-components.css',
  'dist/styles.components.css'
);
