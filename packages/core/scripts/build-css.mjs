import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import postcss, { parse } from 'postcss';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function stripCascadeLayers(css) {
  const rootNode = parse(css);

  rootNode.walkAtRules('layer', atRule => {
    if (!atRule.nodes?.length) {
      atRule.remove();
      return;
    }

    atRule.replaceWith(...atRule.nodes);
  });

  return rootNode.toString();
}

async function buildCss(inputFile, outputFile) {
  const input = path.join(root, inputFile);
  const output = path.join(root, outputFile);

  const css = await fs.readFile(input, 'utf8');

  const result = await postcss([tailwindcss, autoprefixer]).process(css, {
    from: input,
    to: output,
  });

  const builtCss =
    outputFile === 'dist/styles.css'
      ? stripCascadeLayers(result.css)
      : result.css;

  await fs.writeFile(output, builtCss);

  if (result.map) {
    await fs.writeFile(`${output}.map`, result.map.toString());
  }

  console.log('CSS built successfully →', path.relative(root, output));
}

await buildCss('src/styles/tailwind.css', 'dist/styles.css');
await buildCss(
  'src/styles/tailwind-components.css',
  'dist/styles.components.css'
);
