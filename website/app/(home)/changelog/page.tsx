import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { ChangelogFeed } from '@/components/changelog/ChangelogFeed';
import { Lightbox } from '@/components/changelog/Lightbox';
import {
  FeatureNotes,
  ReleaseNotes,
} from '@/components/changelog/ReleaseNotes';
import { getChangelog, SECTION_LABELS } from '@/lib/changelog';
import type { Release, ReleaseImage } from '@/lib/changelog';

import styles from '@/components/changelog/changelog.module.css';

export const metadata: Metadata = {
  title: 'Changelog | DayFlow',
  description:
    'New features, improvements and fixes in every DayFlow release, with screenshots from the live demo.',
  alternates: {
    canonical: '/changelog',
    types: { 'application/rss+xml': '/changelog/rss.xml' },
  },
  openGraph: {
    title: 'DayFlow Changelog',
    description: 'New features, improvements and fixes in every release.',
    url: '/changelog',
  },
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));

function Screenshot({
  image,
  priority,
}: {
  image: ReleaseImage;
  priority?: boolean;
}) {
  const sizes = '(max-width: 768px) 100vw, 760px';
  return (
    <Lightbox
      image={image}
      className={styles.shot}
      // Captured at 2x: no upscaling, and tall crops stay under 520px high.
      style={{
        maxWidth: Math.min(image.width / 2, (520 * image.width) / image.height),
      }}
    >
      <Image
        className={image.darkSrc ? styles.lightOnly : undefined}
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes={sizes}
        priority={priority}
      />
      {image.darkSrc && (
        <Image
          className={styles.darkOnly}
          src={image.darkSrc}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes={sizes}
        />
      )}
    </Lightbox>
  );
}

function ReleaseMeta({ release }: { release: Release }) {
  return (
    <div className={styles.meta}>
      <span className={styles.dot} aria-hidden='true' />
      {release.date ? (
        <time dateTime={release.date}>{formatDate(release.date)}</time>
      ) : (
        <span className={styles.upcoming}>In development</span>
      )}
      <a href={`#${release.id}`} className={styles.version}>
        {release.date ? `v${release.version}` : 'Unreleased'}
      </a>
    </div>
  );
}

function Packages({ release }: { release: Release }) {
  if (release.packages.length === 0) {
    return release.intro ? (
      <div className={styles.packages}>
        <ReleaseNotes markdown={release.intro} />
      </div>
    ) : null;
  }
  return (
    <div className={styles.packages}>
      <span>Packages</span>
      {release.packages.map(group => (
        <span key={group.version} className={styles.packageGroup}>
          {group.names.map(name => (
            <code key={name}>{name}</code>
          ))}
          <b>{group.version}</b>
        </span>
      ))}
    </div>
  );
}

function FeatureRelease({
  release,
  first,
}: {
  release: Release;
  first: boolean;
}) {
  const [hero, ...more] = release.images;
  const visible = release.sections.filter(
    ({ kind }) => kind === 'new' || kind === 'breaking'
  );
  const rest = release.sections.filter(section => !visible.includes(section));
  const restCount = rest.reduce((sum, section) => sum + section.count, 0);
  return (
    <article id={release.id} className={styles.release} data-type='feature'>
      <ReleaseMeta release={release} />
      <div className={styles.body}>
        <h2>
          <a href={`#${release.id}`}>{release.title}</a>
        </h2>
        {release.summary && <p className={styles.summary}>{release.summary}</p>}
        {hero && <Screenshot image={hero} priority={first} />}
        {more.length > 0 && (
          <div className={styles.shotGrid}>
            {more.map(image => (
              <Screenshot key={image.src} image={image} />
            ))}
          </div>
        )}
        {visible.map(section => (
          <section key={section.heading} className={styles.section}>
            <h3 data-kind={section.kind}>{SECTION_LABELS[section.kind]}</h3>
            <FeatureNotes markdown={section.markdown} />
          </section>
        ))}
        {rest.length > 0 && (
          <details className={styles.more}>
            <summary>
              {rest.map(section => SECTION_LABELS[section.kind]).join(' · ')}
              {restCount > 0 && <span>{restCount}</span>}
            </summary>
            {rest.map(section => (
              <section key={section.heading} className={styles.section}>
                <h3 data-kind={section.kind}>{section.heading}</h3>
                <ReleaseNotes markdown={section.markdown} />
              </section>
            ))}
          </details>
        )}
        {release.links.length > 0 && (
          <div className={styles.links}>
            {release.links.map(link => (
              <Link key={link.href} href={link.href}>
                {link.label} <ArrowRight size={13} />
              </Link>
            ))}
          </div>
        )}
        <Packages release={release} />
      </div>
    </article>
  );
}

function MinorRelease({ release }: { release: Release }) {
  return (
    <article id={release.id} className={styles.release} data-type='minor'>
      <ReleaseMeta release={release} />
      <div className={styles.body}>
        <div className={styles.tags}>
          {release.tags.map(tag => (
            <span key={tag} className={styles.typeTag} data-tag={tag}>
              {tag}
            </span>
          ))}
          {release.areas.map(area => (
            <span key={area} className={styles.areaTag}>
              {area}
            </span>
          ))}
        </div>
        <div className={styles.compactNotes}>
          {release.sections.map(section => (
            <ReleaseNotes key={section.heading} markdown={section.markdown} />
          ))}
        </div>
      </div>
    </article>
  );
}

export default function ChangelogPage() {
  const releases = getChangelog();
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Changelog</p>
        <h1>What’s new in DayFlow</h1>
        <p>
          New features, improvements and fixes in every release. Screenshots are
          taken from the <Link href='/demo'>live demo</Link>, so you can try
          each one.
        </p>
        <a
          className={styles.github}
          href='https://github.com/dayflow-js/dayflow/releases'
          target='_blank'
          rel='noreferrer'
        >
          Releases on GitHub <ArrowUpRight size={13} />
        </a>
      </header>

      <ChangelogFeed>
        {releases.map((release, index) =>
          release.type === 'feature' ? (
            <FeatureRelease
              key={release.id}
              release={release}
              first={index === 0}
            />
          ) : (
            <MinorRelease key={release.id} release={release} />
          )
        )}
      </ChangelogFeed>
    </main>
  );
}
