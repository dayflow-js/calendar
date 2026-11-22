import { DocsBody, DocsPage } from 'fumadocs-ui/layouts/docs/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { LanguageCode } from '@/lib/i18n';
import {
  defaultLanguage,
  docsPrefix,
  isIndexedLanguage,
  languages,
} from '@/lib/i18n';
import { BASE_PATH } from '@/lib/site';
import { getPageImage, source } from '@/lib/source';
import { getMDXComponents } from '@/mdx-components';

import { DocsJsonLd } from './DocsJsonLd';

/**
 * `hreflang` map for one page across every locale.
 *
 * `fallbackLanguage` means each locale serves each page — an untranslated one
 * shows the English body under its own URL — so every locale is a genuine
 * alternate. Without this, search engines treat these URLs as duplicate
 * content competing with each other instead of as translations of one page.
 *
 * Only indexed locales appear here: pointing `hreflang` at a `noindex` page
 * tells a crawler to use an alternate we have just asked it to drop.
 */
function docsAlternates(slug: string[]) {
  const languageAlternates = Object.fromEntries(
    languages
      .filter(language => isIndexedLanguage(language.code))
      .map(language => [
        language.code,
        `${docsPrefix(language.code)}/${slug.join('/')}`,
      ])
  );

  return {
    ...languageAlternates,
    'x-default': languageAlternates[defaultLanguage],
  };
}

/**
 * Landing page of a locale's docs section — the first entry of its `meta.json`,
 * with the section's first page as a fallback.
 */
function docsIndexUrl(locale: LanguageCode) {
  return (
    source.getPage(['introduction'], locale)?.url ??
    source.getPages(locale)[0]?.url ??
    `${docsPrefix(locale)}/introduction`
  );
}

/**
 * `redirect()` is dropped when Next statically exports the route, which is why
 * the section root used to render as an empty shell. Emit the redirect as
 * markup instead so it survives the export — React hoists the `<meta>` into
 * `<head>`, and the anchor keeps the page usable if the refresh is blocked.
 */
function DocsIndexRedirect({ locale }: { locale: LanguageCode }) {
  const href = `${BASE_PATH}${docsIndexUrl(locale)}`;

  return (
    <>
      <meta httpEquiv='refresh' content={`0; url=${href}`} />
      <p>
        Redirecting to <a href={href}>{href}</a>…
      </p>
    </>
  );
}

/**
 * One docs page in one locale. Every per-locale `[[...slug]]` route delegates
 * here, so the redirect, the `full` heuristic and the OG image are identical
 * across languages instead of drifting between hand-copied route files.
 */
export async function DocsLocalePage({
  locale,
  slug,
}: {
  locale: LanguageCode;
  slug: string[] | undefined;
}) {
  if (!slug || slug.length === 0) {
    return <DocsIndexRedirect locale={locale} />;
  }

  const page = source.getPage(slug, locale);
  if (!page) notFound();

  const { body: MDX, toc } = await page.data.load();

  const full = page.data.full ?? slug[0] === 'features';

  return (
    <DocsPage
      toc={toc}
      full={full}
      breadcrumb={{ enabled: false }}
      tableOfContent={{ style: 'clerk' }}
    >
      <DocsJsonLd locale={locale} slug={slug} page={page} />
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export function generateDocsParams(locale: LanguageCode) {
  return [
    { slug: [] as string[] },
    ...source.getPages(locale).map(page => ({ slug: page.slugs })),
  ];
}

export function generateDocsMetadata(
  locale: LanguageCode,
  slug: string[] | undefined
): Metadata {
  // The section root only forwards to the first page; keep it out of the index
  // rather than publishing a contentful-looking shell for every locale.
  if (!slug || slug.length === 0) {
    return {
      title: 'Documentation',
      robots: { index: false, follow: true },
      alternates: { canonical: docsIndexUrl(locale) },
    };
  }

  const page = source.getPage(slug, locale);
  if (!page) return {};

  return {
    title: page.data.title,
    description: page.data.description,
    // `follow` stays on: these pages still link into the English docs, and that
    // is the one thing we want a crawler to do while it is here.
    ...(isIndexedLanguage(locale)
      ? {}
      : { robots: { index: false, follow: true } }),
    alternates: {
      canonical: page.url,
      languages: docsAlternates(slug),
    },
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      images: getPageImage(page).url,
    },
  };
}
