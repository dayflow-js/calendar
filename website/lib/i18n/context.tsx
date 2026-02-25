'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Locale = 'en' | 'zh';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'dayflow-locale';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Get locale from localStorage or default to 'en'
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (stored === 'zh' || stored === 'en') {
      setLocaleState(stored);
    }
    setMounted(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);

    // Update URL to reflect language change
    const currentPath = window.location.pathname;
    if (newLocale === 'zh') {
      // Convert /docs/xyz to /docs-zh/xyz
      if (currentPath.startsWith('/docs/')) {
        window.location.href = currentPath.replace('/docs/', '/docs-zh/');
      } else if (currentPath === '/docs') {
        window.location.href = '/docs-zh';
      }
    } else if (currentPath.startsWith('/docs-zh/')) {
      // Convert /docs-zh/xyz to /docs/xyz
      window.location.href = currentPath.replace('/docs-zh/', '/docs/');
    } else if (currentPath === '/docs-zh') {
      window.location.href = '/docs';
    }
  };

  // Detect current locale from URL
  useEffect(() => {
    if (mounted) {
      const path = window.location.pathname;
      if (path.startsWith('/docs-zh')) {
        setLocaleState('zh');
        localStorage.setItem(LOCALE_STORAGE_KEY, 'zh');
      } else if (path.startsWith('/docs')) {
        setLocaleState('en');
        localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
      }
    }
  }, [mounted]);

  const contextValue = React.useMemo(() => ({ locale, setLocale }), [locale]);

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
