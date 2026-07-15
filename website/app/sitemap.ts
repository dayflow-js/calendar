import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

import { blog } from 'fumadocs-mdx:collections/server';

import { SITE_URL } from '@/lib/site';
import { source, sourceJa, sourceZh } from '@/lib/source';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const docPages = source.getPages().map(page => ({
    url: `${SITE_URL}${page.url}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: page.url === '/docs' ? 0.9 : 0.8,
  }));

  const docJaPages = sourceJa.getPages().map(page => ({
    url: `${SITE_URL}${page.url}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const docZhPages = sourceZh.getPages().map(page => ({
    url: `${SITE_URL}${page.url}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const blogPages = blog.map(post => {
    const slug = post.info.path.replace(/\.mdx$/, '');
    return {
      url: `${SITE_URL}/blog/${slug}`,
      lastModified: post.date ? new Date(post.date) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    };
  });

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...docPages,
    ...docJaPages,
    ...docZhPages,
    ...blogPages,
  ];
}
