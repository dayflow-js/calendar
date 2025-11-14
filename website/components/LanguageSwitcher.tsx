'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Languages } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from 'next-themes';

const locales = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' }
];

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState('en');
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const triggerClasses = useMemo(
    () =>
      clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-md p-2 transition-colors',
        isDarkMode
          ? 'text-gray-200 hover:bg-gray-800 focus-visible:outline-white'
          : 'text-gray-700 hover:bg-gray-100 focus-visible:outline-black'
      ),
    [isDarkMode]
  );

  const dropdownClasses = useMemo(
    () =>
      clsx(
        'absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md shadow-lg ring-1 focus:outline-none',
        isDarkMode ? 'bg-gray-900 ring-white/10' : 'bg-white ring-black/5'
      ),
    [isDarkMode]
  );

  const itemClasses = useMemo(
    () =>
      clsx(
        'flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors',
        isDarkMode ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
      ),
    [isDarkMode]
  );

  useEffect(() => {
    setMounted(true);
    // Detect current locale from pathname
    const path = window.location.pathname;
    if (path.startsWith('/docs-zh')) {
      setCurrentLocale('zh');
    } else if (path.startsWith('/docs-ja')) {
      setCurrentLocale('ja');
    } else {
      setCurrentLocale('en');
    }
  }, []);

  const switchLanguage = (newLocale: string) => {
    const path = window.location.pathname;
    let newPath = path;

    // Handle root path first
    if (path === '/') {
      newPath = newLocale === 'zh' ? '/docs-zh' : newLocale === 'ja' ? '/docs-ja' : '/docs';
    } else {
      // Remove any existing locale prefix to get the base path
      let basePath = path;
      if (path.startsWith('/docs-zh')) {
        basePath = path.substring('/docs-zh'.length) || '/';
      } else if (path.startsWith('/docs-ja')) {
        basePath = path.substring('/docs-ja'.length) || '/';
      } else if (path.startsWith('/docs')) {
        basePath = path.substring('/docs'.length) || '/';
      }

      // Ensure basePath starts with /
      if (!basePath.startsWith('/')) {
        basePath = '/' + basePath;
      }

      // Apply the new locale prefix
      if (newLocale === 'zh') {
        newPath = '/docs-zh' + basePath;
      } else if (newLocale === 'ja') {
        newPath = '/docs-ja' + basePath;
      } else {
        // English (default)
        newPath = '/docs' + basePath;
      }

      // Handle the case where basePath is just '/'
      if (basePath === '/') {
        newPath = newPath.replace(/\/$/, '');
      }
    }

    // Store preference and navigate
    localStorage.setItem('dayflow-locale', newLocale);
    window.location.href = newPath;
  };

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="relative inline-block text-left">
        <button
          type="button"
          disabled
          className={clsx(triggerClasses, 'opacity-50')}
          aria-label="Language selector"
        >
          <Languages className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClasses}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Language selector"
      >
        <Languages className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className={dropdownClasses}>
            <div className="py-1" role="menu" aria-orientation="vertical">
              {locales.map((locale) => (
                <button
                  key={locale.code}
                  onClick={() => {
                    switchLanguage(locale.code);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    itemClasses,
                    currentLocale === locale.code && (isDarkMode ? 'bg-gray-800/60' : 'bg-gray-50')
                  )}
                  role="menuitem"
                >
                  <span>{locale.name}</span>
                  {currentLocale === locale.code && (
                    <svg className="ml-auto h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
