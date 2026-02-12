/**
 * Post-build script: strip @layer wrappers from compiled CSS.
 *
 * Tailwind v4 outputs all styles inside CSS Cascade Layers (@layer).
 * Per the CSS spec, un-layered styles ALWAYS beat layered styles.
 * This means consumers without Tailwind (whose CSS is un-layered)
 * will unintentionally override every DayFlow style.
 *
 * This script runs AFTER the rollup build and unwraps all @layer blocks,
 * producing plain CSS that works in any project.
 */
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const cssPath = path.resolve(__dirname, '../dist/styles.css');

const stripLayers = () => ({
  postcssPlugin: 'postcss-strip-layers',
  OnceExit(root) {
    root.walkAtRules('layer', (atRule) => {
      if (atRule.nodes && atRule.nodes.length) {
        atRule.replaceWith(atRule.nodes);
      } else {
        atRule.remove();
      }
    });
  },
});
stripLayers.postcss = true;

async function main() {
  const css = fs.readFileSync(cssPath, 'utf8');
  const result = await postcss([stripLayers]).process(css, { from: cssPath });
  fs.writeFileSync(cssPath, result.css);
  console.log('Stripped @layer wrappers from dist/styles.css');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
