import type { Metadata } from 'next';
import { Head } from 'nextra/components';
import 'nextra-theme-docs/style.css';
import './globals.css';
import { withBasePath } from '@/utils/basePath';

export const metadata: Metadata = {
  title: 'DayFlow - Calendar toolkit for product teams',
  description:
    'A lightweight and elegant React full calendar component for the web',
  icons: {
    icon: [{ url: withBasePath('/logo.svg'), type: 'image/svg+xml' }],
    shortcut: [withBasePath('/logo.png')],
    apple: [withBasePath('/logo.png')],
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
