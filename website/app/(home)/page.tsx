import { ArrowRight, Check, Search, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';

import { LandingRevealEffects } from '@/components/LandingRevealEffects';
import { proUrl, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'DayFlow Calendar - React, Vue, Angular, and Svelte Calendar UI',
  description:
    'DayFlow is a flexible calendar component library for React, Vue, Angular, and Svelte with day, week, month, year, agenda, resource grid, search, drag-and-drop editing, and print-ready calendar views.',
  keywords: [
    'calendar component',
    'React calendar',
    'Vue calendar',
    'Svelte calendar',
    'Angular calendar',
    'resource calendar',
    'scheduler UI',
    'DayFlow',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'DayFlow Calendar - Build Product-Ready Calendar Interfaces',
    description:
      'A modern calendar UI toolkit with multi-view scheduling, event editing, resource planning, search, localization, and print workflows.',
    images: [
      {
        url: '/images/landing/og-card.png',
        width: 1200,
        height: 630,
        alt: 'DayFlow week calendar with sidebar, events, and search',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DayFlow Calendar - Build Product-Ready Calendar Interfaces',
    description:
      'A modern calendar UI toolkit with multi-view scheduling, event editing, resource planning, search, localization, and print workflows.',
    images: [
      {
        url: '/images/landing/og-card.png',
        alt: 'DayFlow week calendar with sidebar, events, and search',
      },
    ],
  },
};

const mediaPath = '/images/landing/';

const extensionCards = [
  {
    title: 'Resource Grid',
    paragraphs: [
      'Plan events across people, rooms, equipment, teams, or any custom resource.',
      'Resource Grid is designed for products that need to compare availability, assign work, and manage schedules across multiple resources.',
    ],
    image: 'resource-grid.png',
    alt: 'DayFlow resource grid view showing schedules by resource',
  },
  {
    title: 'Print Calendar',
    paragraphs: [
      'Create clean calendar output for reports, customer handoff, internal planning, or offline review.',
      'Print Calendar helps users turn calendar data into polished layouts that are easier to share, print, or archive.',
    ],
    image: 'print-calendar.png',
    alt: 'DayFlow print calendar settings and year preview',
  },
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className='mt-6 space-y-3'>
      {items.map(item => (
        <li
          key={item}
          className='flex gap-3 text-sm leading-6 text-slate-700 dark:text-slate-300'
        >
          <Check
            className='mt-0.5 size-5 shrink-0 text-emerald-500'
            aria-hidden='true'
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function VideoFrame({
  src,
  label,
  className = '',
}: {
  src: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950 ${className}`}
    >
      <video
        aria-label={label}
        autoPlay
        className='h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.025]'
        loop
        muted
        playsInline
        preload='metadata'
      >
        <source src={`${mediaPath}${src}`} type='video/mp4' />
      </video>
    </div>
  );
}

type FrameworkLogoProps = {
  className?: string;
};

function ReactLogo({ className = '' }: FrameworkLogoProps) {
  return (
    <svg
      role='img'
      aria-label='React logo'
      viewBox='0 0 24 24'
      className={`size-7 ${className}`}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236Zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278Zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295Zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132Zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565ZM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098Zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386Zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146Zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964Zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494Zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18Zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933ZM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54Zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438Zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565Z'
        fill='currentColor'
      />
    </svg>
  );
}

function VueLogo({ className = '' }: FrameworkLogoProps) {
  return (
    <svg
      role='img'
      aria-label='Vue logo'
      viewBox='0 0 24 24'
      className={`size-7 ${className}`}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M24 1.61H14.06L12 5.16 9.94 1.61H0L12 22.39 24 1.61ZM12 14.08 5.16 2.23H9.59L12 6.41l2.41-4.18h4.43L12 14.08Z'
        fill='currentColor'
      />
    </svg>
  );
}

function SvelteLogo({ className = '' }: FrameworkLogoProps) {
  return (
    <svg
      role='img'
      aria-label='Svelte logo'
      viewBox='0 0 24 24'
      className={`size-7 ${className}`}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M10.354 21.125a4.44 4.44 0 0 1-4.765-1.767 4.109 4.109 0 0 1-.703-3.107 3.898 3.898 0 0 1 .134-.522l.105-.321.287.21a7.21 7.21 0 0 0 2.186 1.092l.208.063-.02.208a1.253 1.253 0 0 0 .226.83 1.337 1.337 0 0 0 1.435.533 1.231 1.231 0 0 0 .343-.15l5.59-3.562a1.164 1.164 0 0 0 .524-.778 1.242 1.242 0 0 0-.211-.937 1.338 1.338 0 0 0-1.435-.533 1.23 1.23 0 0 0-.343.15l-2.133 1.36a4.078 4.078 0 0 1-1.135.499 4.44 4.44 0 0 1-4.765-1.766 4.108 4.108 0 0 1-.702-3.108 3.855 3.855 0 0 1 1.742-2.582l5.589-3.563a4.072 4.072 0 0 1 1.135-.499 4.44 4.44 0 0 1 4.765 1.767 4.109 4.109 0 0 1 .703 3.107 3.943 3.943 0 0 1-.134.522l-.105.321-.286-.21a7.204 7.204 0 0 0-2.187-1.093l-.208-.063.02-.207a1.255 1.255 0 0 0-.226-.831 1.337 1.337 0 0 0-1.435-.532 1.231 1.231 0 0 0-.343.15L8.62 9.368a1.162 1.162 0 0 0-.524.778 1.24 1.24 0 0 0 .211.937 1.338 1.338 0 0 0 1.435.533 1.235 1.235 0 0 0 .344-.151l2.132-1.36a4.067 4.067 0 0 1 1.135-.498 4.44 4.44 0 0 1 4.765 1.766 4.108 4.108 0 0 1 .702 3.108 3.857 3.857 0 0 1-1.742 2.583l-5.589 3.562a4.072 4.072 0 0 1-1.135.499m10.358-17.95C18.484-.015 14.082-.96 10.9 1.068L5.31 4.63a6.412 6.412 0 0 0-2.896 4.295 6.753 6.753 0 0 0 .666 4.336 6.43 6.43 0 0 0-.96 2.396 6.833 6.833 0 0 0 1.168 5.167c2.229 3.19 6.63 4.135 9.812 2.108l5.59-3.562a6.41 6.41 0 0 0 2.896-4.295 6.756 6.756 0 0 0-.665-4.336 6.429 6.429 0 0 0 .958-2.396 6.831 6.831 0 0 0-1.167-5.168Z'
        fill='currentColor'
      />
    </svg>
  );
}

function AngularLogo({ className = '' }: FrameworkLogoProps) {
  return (
    <svg
      role='img'
      aria-label='Angular logo'
      viewBox='0 0 24 24'
      className={`size-7 ${className}`}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M16.712 17.711H7.288l-1.204 2.916L12 24l5.916-3.373-1.204-2.916ZM14.692 0l7.832 16.855.814-12.856L14.692 0ZM9.308 0 .662 3.999l.814 12.856L9.308 0Zm-.405 13.93h6.198L12 6.396 8.903 13.93Z'
        fill='currentColor'
      />
    </svg>
  );
}

const frameworks = [
  {
    name: 'React',
    logo: ReactLogo,
    colorClass: 'text-sky-500',
  },
  {
    name: 'Vue',
    logo: VueLogo,
    colorClass: 'text-emerald-500',
  },
  {
    name: 'Angular',
    logo: AngularLogo,
    colorClass: 'text-red-600',
  },
  {
    name: 'Svelte',
    logo: SvelteLogo,
    colorClass: 'text-orange-600',
  },
];

const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'DayFlow Calendar',
  description:
    'A lightweight and elegant full calendar component for React, Vue, Angular, and Svelte with day, week, month, year, agenda, resource grid, search, drag-and-drop editing, and print-ready views.',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  image: `${SITE_URL}/images/landing/og-card.png`,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  author: {
    '@type': 'Organization',
    name: 'DayFlow',
    url: SITE_URL,
  },
};

export default function HomePage() {
  return (
    <main className='landing-root relative min-h-screen overflow-hidden bg-white text-slate-950 dark:bg-slate-950 dark:text-white'>
      <Script
        id='ld-software-application'
        type='application/ld+json'
        strategy='beforeInteractive'
        // oxlint-disable-next-line no-danger -- JSON-LD payload is JSON.stringify'd (no XSS risk); this is the Next.js-recommended way to embed structured data
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd),
        }}
      />
      <LandingRevealEffects />
      <div className='hero-glow absolute inset-0' />

      <section
        className='relative z-10 px-4 pt-12 pb-14 sm:px-6 lg:px-8'
        data-reveal
      >
        <div className='mx-auto max-w-7xl'>
          <div className='grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]'>
            <div className='max-w-2xl'>
              <p className='inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200'>
                <Sparkles className='size-4' aria-hidden='true' />
                Calendar toolkit for product teams
              </p>
              <h1 className='mt-6 text-4xl leading-tight font-semibold text-slate-950 sm:text-5xl lg:text-6xl dark:text-white'>
                A lightweight calendar library for modern scheduling products.
              </h1>
              <p className='mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300'>
                Build fast calendar interfaces for{' '}
                <span className='font-bold text-blue-600 dark:text-blue-300'>
                  React
                </span>
                ,{' '}
                <span className='font-bold text-blue-600 dark:text-blue-300'>
                  Vue
                </span>
                ,{' '}
                <span className='font-bold text-blue-600 dark:text-blue-300'>
                  Angular
                </span>
                , and{' '}
                <span className='font-bold text-blue-600 dark:text-blue-300'>
                  Svelte
                </span>
                . DayFlow handles multi-view calendars, event editing, search,
                resource planning, localization, and print workflows so your
                product can focus on the scheduling rules that make it unique.
              </p>
              <div className='mt-8 flex flex-wrap items-center gap-3'>
                <Link
                  href='/demo'
                  className='inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500'
                >
                  View Example
                  <ArrowRight className='size-4' aria-hidden='true' />
                </Link>
                <Link
                  href='/docs/introduction'
                  className='inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:text-blue-600 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-blue-300'
                >
                  Read docs
                </Link>
              </div>
            </div>

            <div className='relative'>
              <div className='group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/30'>
                <Image
                  src={`${mediaPath}basic.png`}
                  alt='DayFlow week calendar with multiple calendars, events, sidebar, and search'
                  width={2524}
                  height={1512}
                  priority
                  className='h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.025]'
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id='examples'
        className='relative z-10 px-4 py-16 sm:px-6 lg:px-8'
        data-reveal
      >
        <div className='mx-auto max-w-7xl'>
          <div className='grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center'>
            <div>
              <p className='text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase dark:text-white'>
                Create and adjust
              </p>
              <h2 className='mt-3 text-3xl font-semibold sm:text-4xl'>
                Scheduling interactions that feel native to your app
              </h2>
              <p className='mt-4 text-base leading-7 text-slate-600 dark:text-slate-300'>
                Users can create events directly on the calendar, resize time
                blocks, edit details, and keep momentum with keyboard-first
                navigation. The component owns the calendar mechanics while your
                app owns the data model and business rules.
              </p>
              <FeatureList
                items={[
                  'Fast event creation from the visible time grid',
                  'Drag and resize behavior for day and week planning',
                  'Custom event content and detail experiences',
                  'Works with local state, remote APIs, and sync adapters',
                ]}
              />
            </div>
            <VideoFrame
              src='create-event.mp4'
              label='Creating an event in DayFlow'
            />
          </div>
        </div>
      </section>

      <section className='relative z-10 px-4 py-16 sm:px-6 lg:px-8' data-reveal>
        <div className='mx-auto max-w-7xl'>
          <h2 className='text-center text-3xl font-semibold text-slate-950 sm:text-4xl dark:text-white'>
            Native components for your stack
          </h2>
          <div className='mt-10 flex flex-wrap items-center justify-center gap-3'>
            {frameworks.map(({ name, logo: Logo, colorClass }) => (
              <div
                key={name}
                title={name}
                className='inline-flex min-h-12 items-center gap-3 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-black shadow-[0_14px_38px_rgba(40,52,76,0.08),inset_0_1px_0_rgba(255,255,255,0.84)] backdrop-blur transition-transform duration-300 hover:scale-105 dark:border-slate-200 dark:bg-white dark:text-black'
              >
                <Logo className={colorClass} />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='relative z-10 px-4 py-16 sm:px-6 lg:px-8' data-reveal>
        <div className='mx-auto max-w-7xl'>
          <div className='grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center'>
            <VideoFrame
              src='search-focus.mp4'
              label='Searching and focusing events in DayFlow'
            />
            <div>
              <p className='inline-flex items-center gap-2 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase dark:text-white'>
                <Search className='size-4' aria-hidden='true' />
                Search
              </p>
              <h2 className='mt-3 text-3xl font-semibold sm:text-4xl'>
                Find events without losing your place
              </h2>
              <p className='mt-4 text-base leading-7 text-slate-600 dark:text-slate-300'>
                Search is built directly into the calendar, so users can quickly
                find the event they need while still seeing the surrounding
                schedule.
              </p>
              <FeatureList
                items={[
                  'Search inside the calendar, not on a separate page',
                  'Quickly narrow down events in dense schedules',
                  'Open the right event and continue working from the same view',
                  'Works well with custom headers, toolbars, and command menus',
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      <section className='relative z-10 px-4 py-16 sm:px-6 lg:px-8' data-reveal>
        <div className='mx-auto max-w-7xl'>
          <div className='grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center'>
            <div>
              <p className='text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase dark:text-white'>
                Multiple views
              </p>
              <h2 className='mt-3 text-3xl font-semibold sm:text-4xl'>
                See the schedule from the right distance
              </h2>
              <p className='mt-4 text-base leading-7 text-slate-600 dark:text-slate-300'>
                Some tasks need a detailed day view. Others need a wider picture
                of the month or year. DayFlow gives users different ways to look
                at time, without changing how events behave.
              </p>
              <FeatureList
                items={[
                  'Day, Week, Month, Year, and Agenda views',
                  'Big Year, Fixed Week Year, and Grid Year views',
                  'Timeline and Grid views for resource and schedule planning',
                  'Consistent colors, interactions, and navigation across views',
                ]}
              />
            </div>
            <VideoFrame
              src='mutil-view.mp4'
              label='Switching between DayFlow calendar views'
            />
          </div>
        </div>
      </section>

      <section className='relative z-10 px-4 py-16 sm:px-6 lg:px-8' data-reveal>
        <div className='mx-auto max-w-7xl'>
          <div className='mx-auto max-w-3xl text-center'>
            <p className='text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase dark:text-white'>
              DayFlow Pro
            </p>
            <h2 className='mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl dark:text-white'>
              Add advanced planning when needed
            </h2>
            <p className='mt-4 text-base leading-7 text-slate-600 dark:text-slate-300'>
              DayFlow Pro adds larger planning tools on top of the core
              calendar. It is useful when your product needs resource
              scheduling, printable calendars, or more structured planning
              views.
            </p>
          </div>
          <div className='mt-10 grid gap-6 lg:grid-cols-2'>
            {extensionCards.map(card => (
              <article
                key={card.title}
                className='group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950'
              >
                <Image
                  src={`${mediaPath}${card.image}`}
                  alt={card.alt}
                  width={card.image === 'resource-grid.png' ? 2618 : 2284}
                  height={card.image === 'resource-grid.png' ? 1510 : 1474}
                  className='aspect-[16/9] w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.025]'
                />
                <div className='p-6'>
                  <h3 className='text-xl font-semibold'>{card.title}</h3>
                  {card.paragraphs.map(paragraph => (
                    <p
                      key={paragraph}
                      className='mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300'
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className='relative z-10 px-4 py-16 sm:px-6 lg:px-8' data-reveal>
        <div className='mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between'>
          <div className='max-w-2xl'>
            <p className='text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase dark:text-white'>
              Build with DayFlow
            </p>
            <h2 className='mt-3 text-3xl font-semibold'>
              Add a production-ready calendar to your product.
            </h2>
            <p className='mt-4 text-base leading-7 text-slate-600 dark:text-slate-300'>
              Start with the open source packages, then move into Pro views when
              your scheduling workflow needs resource planning or printable
              operations output.
            </p>
          </div>
          <div className='flex flex-wrap gap-3'>
            <Link
              href={proUrl('landing_cta')}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500'
            >
              View DayFlow Pro
              <ArrowRight className='size-4' aria-hidden='true' />
            </Link>
            <Link
              href='/docs'
              className='inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:text-blue-600 dark:border-white/15 dark:text-white dark:hover:border-blue-300'
            >
              Read docs
            </Link>
          </div>
        </div>
      </section>

      <footer className='relative z-10 px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400'>
        MIT {new Date().getFullYear()} © DayFlow.
      </footer>
    </main>
  );
}
