import { DocsBody, DocsPage } from 'fumadocs-ui/layouts/docs/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { sourceJa } from '@/lib/source';
import { getMDXComponents } from '@/mdx-components';

export default async function Page(props: PageProps<'/docs-ja/[[...slug]]'>) {
  const params = await props.params;
  const page = sourceJa.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  const full = page.data.full ?? params.slug?.[0] === 'features';

  return (
    <DocsPage
      toc={page.data.toc}
      full={full}
      breadcrumb={{ enabled: false }}
      tableOfContent={{ style: 'clerk' }}
    >
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(sourceJa, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return sourceJa.generateParams();
}

export async function generateMetadata(
  props: PageProps<'/docs-ja/[[...slug]]'>
): Promise<Metadata> {
  const params = await props.params;
  const page = sourceJa.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
