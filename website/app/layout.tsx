import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './global.css';
import Script from 'next/script';

import { AppProvider } from '@/components/AppProvider';
import { BASE_PATH, SITE_METADATA_BASE } from '@/lib/site';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: SITE_METADATA_BASE,
  applicationName: 'DayFlow',
  authors: [{ name: 'DayFlow', url: 'https://dayflow.studio/' }],
  creator: 'DayFlow',
  publisher: 'DayFlow',
  title: {
    template: '%s | DayFlow',
    default: 'DayFlow – Lightweight calendar component',
  },
  description:
    'A lightweight and elegant full calendar component for React, Vue, Angular, and Svelte. Supports day, week, month, and year views with drag-and-drop, localization, and dark mode.',
  icons: {
    icon: `${BASE_PATH}/icon.png`,
    shortcut: `${BASE_PATH}/icon.png`,
    apple: `${BASE_PATH}/apple-icon.png`,
  },
  openGraph: {
    type: 'website',
    siteName: 'DayFlow',
    title: {
      template: '%s',
      default: 'DayFlow – Lightweight calendar component',
    },
    description:
      'A lightweight and elegant full calendar component for React, Vue, Angular, and Svelte.',
    images: [
      {
        url: `${BASE_PATH}/logo.png`,
        width: 512,
        height: 512,
        alt: 'DayFlow Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: {
      template: '%s',
      default: 'DayFlow – Lightweight calendar component',
    },
    description:
      'A lightweight and elegant full calendar component for React, Vue, Angular, and Svelte.',
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang='en' className={inter.className} suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === 'production' && (
          <Script id='google-analytics' strategy='afterInteractive'>
            {`
              const measurementId = 'G-QEXJYTSEME';
              const isLocalHostname = (hostname) =>
                hostname === 'localhost' ||
                hostname.endsWith('.localhost') ||
                hostname === '0.0.0.0' ||
                hostname === '::1' ||
                hostname === '[::1]' ||
                hostname.startsWith('127.');

              if (isLocalHostname(window.location.hostname)) {
                window['ga-disable-' + measurementId] = true;
              } else {
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());

                let isLocalReferrer = false;
                if (document.referrer) {
                  try {
                    isLocalReferrer = isLocalHostname(
                      new URL(document.referrer).hostname,
                    );
                  } catch {}
                }

                gtag('config', measurementId, {
                  ...(isLocalReferrer ? { ignore_referrer: 'true' } : {}),
                });

                const script = document.createElement('script');
                script.async = true;
                script.src =
                  'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
                document.head.appendChild(script);
              }
            `}
          </Script>
        )}
      </head>
      <body className='flex min-h-screen flex-col'>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
