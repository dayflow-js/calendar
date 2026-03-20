import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';

import './global.css';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
});

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_PATH
      ? `https://dayflow-js.github.io/calendar/`
      : 'http://localhost:3000'
  ),
  title: {
    template: '%s | DayFlow',
    default: 'DayFlow - Lightweight Calendar Component',
  },
  description:
    'A lightweight and elegant full calendar component for React, Vue, Angular, and Svelte. Supports day, week, month, and year views with drag-and-drop, localization, and dark mode.',
  openGraph: {
    type: 'website',
    siteName: 'DayFlow',
    title: {
      template: '%s | DayFlow',
      default: 'DayFlow - Lightweight Calendar Component',
    },
    description:
      'A lightweight and elegant full calendar component for React, Vue, Angular, and Svelte.',
    images: [
      {
        url: `${BASE}/logo.png`,
        width: 512,
        height: 512,
        alt: 'DayFlow Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: {
      template: '%s | DayFlow',
      default: 'DayFlow - Lightweight Calendar Component',
    },
    description:
      'A lightweight and elegant full calendar component for React, Vue, Angular, and Svelte.',
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang='en' className={inter.className} suppressHydrationWarning>
      <body className='flex min-h-screen flex-col'>
        <RootProvider
          search={{ options: { type: 'static', api: `${BASE}/api/search` } }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
