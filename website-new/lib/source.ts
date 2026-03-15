import { loader } from 'fumadocs-core/source';
import type { InferPageType } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docs, docsJa, docsZh } from 'fumadocs-mdx:collections/server';

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export const sourceJa = loader({
  baseUrl: '/docs-ja',
  source: docsJa.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export const sourceZh = loader({
  baseUrl: '/docs-zh',
  source: docsZh.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `/og/docs/${segments.join('/')}`,
  };
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title}

${processed}`;
}
