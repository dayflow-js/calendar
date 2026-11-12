import { getChangelog, SECTION_LABELS } from '@/lib/changelog';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

const escape = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** Plain-text bullets, without Markdown emphasis or code marks. */
const plain = (markdown: string) =>
  markdown
    .replaceAll(/[*`]/g, '')
    .replaceAll(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();

export function GET() {
  const items = getChangelog()
    .filter(release => release.date)
    .map(release => {
      const url = `${SITE_URL}/changelog#${release.id}`;
      const title =
        release.type === 'feature'
          ? `${release.version}: ${release.title}`
          : `${release.version}: ${release.tags.join(', ')}`;
      const notes = release.sections
        .map(
          section =>
            `${SECTION_LABELS[section.kind]}\n${plain(section.markdown)}`
        )
        .join('\n\n');
      const description = [release.summary, notes].filter(Boolean).join('\n\n');
      return `    <item>
      <title>${escape(title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${release.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escape(description)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>DayFlow Changelog</title>
    <link>${SITE_URL}/changelog</link>
    <atom:link href="${SITE_URL}/changelog/rss.xml" rel="self" type="application/rss+xml" />
    <description>New features, improvements and fixes in every DayFlow release.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
