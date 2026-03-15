import { blog } from 'fumadocs-mdx:collections/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getMDXComponents } from '@/mdx-components';

function findPost(slug: string[]) {
  const target = slug.join('/');
  return blog.find(p => p.info.path.replace(/\.mdx$/, '') === target);
}

export default async function BlogPost(props: {
  params: Promise<{ slug: string[] }>;
}) {
  const params = await props.params;
  const page = findPost(params.slug);
  if (!page) notFound();

  const MDX = page.body;

  return (
    <div className='mx-auto max-w-4xl px-6 py-12'>
      <div className='mb-8'>
        {page.date && (
          <time
            dateTime={page.date}
            className='text-fd-muted-foreground text-sm'
          >
            {new Date(page.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        )}
        <h1 className='mt-4 text-4xl font-bold tracking-tight'>{page.title}</h1>
        {page.description && (
          <p className='text-fd-muted-foreground mt-4 text-lg'>
            {page.description}
          </p>
        )}
      </div>
      <div className='prose dark:prose-invert max-w-none'>
        <MDX components={getMDXComponents()} />
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return blog.map(page => ({
    slug: page.info.path.replace(/\.mdx$/, '').split('/'),
  }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = findPost(params.slug);
  if (!page) notFound();

  return {
    title: page.title,
    description: page.description,
  };
}
