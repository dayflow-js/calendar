import type { Metadata } from 'next';
import { Head } from 'nextra/components';
import 'nextra-theme-docs/style.css';
import './globals.css';
import { withBasePath } from '@/utils/basePath';
import '@dayflow/core/dist/styles.css';

export const metadata: Metadata = {
  title: {
    default:
      'DayFlow - The Universal Calendar Component for React, Vue, Svelte & Angular',
    template: '%s | DayFlow',
  },
  description:
    'A high-performance, framework-agnostic calendar toolkit. Build Google/Mac Calendar-like scheduling interfaces with React, Vue, Svelte, or Angular. Lightweight, customizable, and drag-and-drop ready.',
  applicationName: 'DayFlow',
  keywords: [
    'calendar',
    'react-calendar',
    'vue-calendar',
    'svelte-calendar',
    'angular-calendar',
    'scheduler',
    'fullcalendar-alternative',
    'dayflow',
    'drag-and-drop',
    'scheduling-library',
  ],
  authors: [{ name: 'Jayce Li', url: 'https://github.com/dayflow-js' }],
  creator: 'Jayce Li',
  publisher: 'DayFlow',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: withBasePath('/logo.svg'), type: 'image/svg+xml' }],
    shortcut: [withBasePath('/logo.png')],
    apple: [withBasePath('/logo.png')],
  },
  openGraph: {
    title: 'DayFlow - The Universal Calendar Component',
    description:
      'Build powerful scheduling interfaces with DayFlow. Supports React, Vue, Svelte, and Angular with a lightweight 3KB core.',
    url: 'https://dayflow.js.org',
    siteName: 'DayFlow Documentation',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DayFlow - The Universal Calendar Component',
    description:
      'A high-performance, framework-agnostic calendar toolkit. Build Google/Mac Calendar-like scheduling interfaces with React, Vue, Svelte, or Angular.',
    creator: '@dayflowjs',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>{children}</body>
    </html>
  );
}
