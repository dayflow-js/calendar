import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const input = path.join(root, 'src/styles/tailwind.css');
const output = path.join(root, 'dist/styles.css');

const css = await fs.readFile(input, 'utf8');

const result = await postcss([tailwindcss, autoprefixer]).process(css, {
  from: input,
  to: output,
});

await fs.writeFile(output, result.css);

if (result.map) {
  await fs.writeFile(`${output}.map`, result.map.toString());
}

console.log('CSS built successfully →', path.relative(root, output));
