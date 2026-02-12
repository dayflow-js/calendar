/**
 * PostCSS plugin: strip @layer wrappers from compiled CSS.
 *
 * Tailwind v4 outputs all styles inside CSS Cascade Layers (@layer).
 * Per the CSS spec, un-layered styles ALWAYS beat layered styles.
 * This means consumers without Tailwind (whose globals.css is un-layered)
 * will unintentionally override every DayFlow style.
 *
 * This plugin runs AFTER @tailwindcss/postcss and unwraps all @layer blocks,
 * producing plain CSS that works in any project.
 */
const stripLayers = () => ({
  postcssPlugin: 'postcss-strip-layers',
  AtRule: {
    layer: (atRule) => {
      if (atRule.nodes && atRule.nodes.length) {
        atRule.replaceWith(atRule.nodes);
      } else {
        atRule.remove();
      }
    },
  },
});
stripLayers.postcss = true;

module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    'postcss-strip-layers': stripLayers,
    autoprefixer: {},
  },
};
