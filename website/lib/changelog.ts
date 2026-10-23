import fs from 'node:fs';
import path from 'node:path';

import { releaseMeta } from '@/changelog/releases';
import manifest from '@/public/images/changelog/manifest.json';

export type SectionKind =
  | 'new'
  | 'breaking'
  | 'improvements'
  | 'performance'
  | 'fixes'
  | 'docs';

export interface ReleaseSection {
  kind: SectionKind;
  heading: string;
  markdown: string;
  /** Number of top-level list items. */
  count: number;
}

export interface ReleaseImage {
  src: string;
  /** Dark-theme capture, when one exists. */
  darkSrc?: string;
  width: number;
  height: number;
  alt: string;
}

const SECTION_KINDS: [RegExp, SectionKind][] = [
  [/breaking/i, 'breaking'],
  [/new|feature|architecture|overhaul/i, 'new'],
  [/perf/i, 'performance'],
  [/fix/i, 'fixes'],
  [/doc/i, 'docs'],
];

export const SECTION_LABELS: Record<SectionKind, string> = {
  new: 'New',
  breaking: 'Breaking',
  improvements: 'Improvements',
  performance: 'Performance',
  fixes: 'Fixes',
  docs: 'Docs',
};

const websiteRoot = process.cwd().endsWith('website')
  ? process.cwd()
  : path.join(process.cwd(), 'website');
const imageDir = path.join(websiteRoot, 'public/images/changelog');
const images = manifest as Record<
  string,
  { width: number; height: number; alt?: string }
>;

function resolveImage(name: string): ReleaseImage {
  const entry = images[name];
  if (!entry) {
    throw new Error(
      `Changelog image "${name}" is missing. Add it to changelog/shots.json and run npm run changelog:capture ${name}.`
    );
  }
  const hasDark = fs.existsSync(path.join(imageDir, `${name}-dark.webp`));
  return {
    src: `/images/changelog/${name}.webp`,
    darkSrc: hasDark ? `/images/changelog/${name}-dark.webp` : undefined,
    width: entry.width,
    height: entry.height,
    alt: entry.alt ?? name,
  };
}

function parseSections(body: string) {
  const parts = body.split(/^### (.+)$/m);
  const sections: ReleaseSection[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].trim();
    const markdown = parts[i + 1].trim();
    sections.push({
      heading,
      markdown,
      kind:
        SECTION_KINDS.find(([pattern]) => pattern.test(heading))?.[1] ??
        'improvements',
      count: (markdown.match(/^- /gm) ?? []).length,
    });
  }
  return { intro: parts[0].trim(), sections };
}

/**
 * "Released in this version: `@dayflow/core`, `@dayflow/react` 3.7.4 ·
 * `@dayflow/plugin-sidebar` 1.6.4." → one entry per version group.
 */
function parsePackages(intro: string) {
  if (!/released in this version/i.test(intro)) return [];
  return intro
    .split('·')
    .map(group => ({
      names: [...group.matchAll(/`@dayflow\/([^`]+)`/g)].map(match => match[1]),
      version: group.match(/(\d+\.\d+\.\d+)(?!.*\d+\.\d+\.\d+)/)?.[1] ?? '',
    }))
    .filter(group => group.names.length > 0 && group.version);
}

const VIEW_PATTERN = /\b(Day|Week|Month|Year|Agenda)[ -]?View\b/gi;
const PACKAGE_PATTERN = /@dayflow\/([a-z-]+)/g;

/** Area tags for compact releases: affected views and packages. */
function areaTags(markdown: string) {
  const views = [...markdown.matchAll(VIEW_PATTERN)].map(
    match =>
      `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()} view`
  );
  const packages = [...markdown.matchAll(PACKAGE_PATTERN)].map(
    match => match[1]
  );
  return [...new Set([...views, ...packages])].slice(0, 5);
}

/** The repository changelog stays the single source of complete release notes. */
export function getChangelog() {
  const markdown = fs.readFileSync(
    path.join(websiteRoot, '..', 'CHANGELOG.md'),
    'utf8'
  );
  const headings = [
    ...markdown.matchAll(/^## \[([^\]]+)\](?: - (\d{4}-\d{2}-\d{2}))?\s*$/gm),
  ];
  return headings.map((heading, index) => {
    const version = heading[1];
    const meta = releaseMeta[version];
    const body = markdown
      .slice(
        (heading.index ?? 0) + heading[0].length,
        headings[index + 1]?.index ?? markdown.length
      )
      .trim()
      .replace(/\n---\s*$/, '');
    const { intro, sections } = parseSections(body);
    const isFeature =
      Boolean(meta) ||
      sections.some(({ kind }) => kind === 'new' || kind === 'breaking');
    return {
      version,
      date: heading[2] ?? null,
      id: version === 'Unreleased' ? 'unreleased' : `v${version}`,
      type: isFeature ? ('feature' as const) : ('minor' as const),
      title: meta?.title ?? `DayFlow ${version}`,
      summary: meta?.summary,
      images: (meta?.images ?? []).map(resolveImage),
      links: meta?.links ?? [],
      /** Package versions shipped in the release, when listed. */
      packages: parsePackages(intro),
      intro,
      sections,
      tags: [...new Set(sections.map(section => SECTION_LABELS[section.kind]))],
      areas: areaTags(body),
    };
  });
}

export type Release = ReturnType<typeof getChangelog>[number];
