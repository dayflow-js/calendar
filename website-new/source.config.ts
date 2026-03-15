import { metaSchema } from 'fumadocs-core/source/schema';
import {
  defineConfig,
  defineDocs,
  defineCollections,
  frontmatterSchema,
} from 'fumadocs-mdx/config';
import { z } from 'zod';

const customPageSchema = frontmatterSchema.extend({
  title: z.string().optional(),
});

const docsOptions = {
  docs: {
    schema: customPageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
};

export const docs = defineDocs({ dir: 'content/docs', ...docsOptions });
export const docsJa = defineDocs({ dir: 'content/docs-ja', ...docsOptions });
export const docsZh = defineDocs({ dir: 'content/docs-zh', ...docsOptions });

export const blog = defineCollections({
  type: 'doc',
  dir: 'content/blog',
  schema: frontmatterSchema.extend({
    date: z.string().optional(),
  }),
});

export default defineConfig({
  mdxOptions: {},
});
