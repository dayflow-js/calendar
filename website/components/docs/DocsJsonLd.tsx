import type { InferPageType } from 'fumadocs-core/source';

import type { LanguageCode } from '@/lib/i18n';
import { docsPrefix } from '@/lib/i18n';
import { SITE_URL } from '@/lib/site';
import { getPageImage, source } from '@/lib/source';

type DocsPage = InferPageType<typeof source>;

const absolute = (path: string) => new URL(path, `${SITE_URL}/`).toString();

/**
 * Turns a slug segment into a readable label when no page backs it, e.g. a
 * `meta.json`-only folder: `use-calendar-app` -> `Use Calendar App`.
 */
function labelFromSlug(segment: string) {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function breadcrumbList(locale: LanguageCode, slug: string[], page: DocsPage) {
  const items = [
    { name: 'DayFlow', item: absolute('/') },
    { name: 'Documentation', item: absolute(docsPrefix(locale)) },
  ];

  // Every ancestor of the page, so the trail matches the sidebar hierarchy
  // rather than jumping straight from the docs root to a nested page.
  slug.forEach((segment, index) => {
    const ancestorSlug = slug.slice(0, index + 1);
    const isSelf = index === slug.length - 1;
    const ancestor = isSelf ? page : source.getPage(ancestorSlug, locale);

    items.push({
      name: ancestor?.data.title ?? labelFromSlug(segment),
      item: absolute(
        ancestor?.url ?? `${docsPrefix(locale)}/${ancestorSlug.join('/')}`
      ),
    });
  });

  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  };
}

/**
 * Structured data for one docs page.
 *
 * The landing page ships `SoftwareApplication`, but the 35 English docs pages
 * carried no structured data at all — nothing told a crawler they are technical
 * documentation for the library, or how they sit in a hierarchy.
 *
 * `TechArticle` is the type Google documents for developer documentation, and
 * `BreadcrumbList` is what renders the hierarchy in a result instead of a bare
 * URL. Both go in one `@graph` so there is a single script tag per page.
 */
export function DocsJsonLd({
  locale,
  slug,
  page,
}: {
  locale: LanguageCode;
  slug: string[];
  page: DocsPage;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: page.data.title,
        ...(page.data.description
          ? { description: page.data.description }
          : {}),
        inLanguage: locale,
        url: absolute(page.url),
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': absolute(page.url),
        },
        image: absolute(getPageImage(page).url),
        isPartOf: {
          '@type': 'WebSite',
          name: 'DayFlow',
          url: absolute('/'),
        },
        author: {
          '@type': 'Organization',
          name: 'DayFlow',
          url: 'https://dayflow.studio/',
        },
        publisher: {
          '@type': 'Organization',
          name: 'DayFlow',
          url: 'https://dayflow.studio/',
        },
      },
      breadcrumbList(locale, slug, page),
    ],
  };

  // A plain <script>, not next/script: `strategy='beforeInteractive'` is only
  // honoured in the root layout. Anywhere else next/script queues the tag for
  // client-side injection, so it never reaches the exported HTML -- which is
  // the only copy a crawler reads. React renders this one into the markup.
  return (
    <script
      type='application/ld+json'
      // oxlint-disable-next-line no-danger -- JSON-LD payload is JSON.stringify'd (no XSS risk); this is the Next.js-recommended way to embed structured data
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
