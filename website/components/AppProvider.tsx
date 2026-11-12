'use client';

import { RootProvider } from 'fumadocs-ui/provider/next';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { DocsSearchDialog } from '@/components/DocsSearchDialog';
import { getLanguageCodeFromPathname, localeItems } from '@/lib/i18n';
import { BASE_PATH } from '@/lib/site';
import { uiTranslations } from '@/lib/ui-translations';

// Suppress React 19 / Next.js 16 false-positive warning for next-themes script tag in development
if (process.env.NODE_ENV === 'development') {
  const isPatched = '__react19_script_patched' in console;
  if (!isPatched) {
    Object.defineProperty(console, '__react19_script_patched', { value: true });
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const msg =
        typeof args[0] === 'string'
          ? args[0]
          : (args[0] as Error)?.message || '';
      if (typeof msg === 'string' && msg.includes('Encountered a script tag')) {
        return;
      }
      originalError.apply(console, args);
    };
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const locale = getLanguageCodeFromPathname(pathname);

  return (
    <RootProvider
      search={{
        SearchDialog: DocsSearchDialog,
        options: { api: `${BASE_PATH}/api/search` },
      }}
      i18n={{
        locale,
        locales: localeItems,
        translations: uiTranslations[locale],
      }}
    >
      {children}
    </RootProvider>
  );
}
