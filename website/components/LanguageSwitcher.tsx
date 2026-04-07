'use client';

import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Languages } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { getLanguageCodeFromPathname, languages } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/i18n';
import { BASE_PATH } from '@/lib/site';

function switchTo(newLocale: LanguageCode, currentPath: string) {
  const current = languages.find(
    language => language.code === getLanguageCodeFromPathname(currentPath)
  );
  const next = languages.find(language => language.code === newLocale);
  if (!next) return;

  const isDocsPath = languages.some(
    language =>
      currentPath === language.prefix ||
      currentPath.startsWith(`${language.prefix}/`)
  );

  if (!isDocsPath) {
    localStorage.setItem('dayflow-locale', newLocale);
    window.location.href = BASE_PATH + `${next.prefix}/introduction`;
    return;
  }

  // strip current locale prefix
  let contentPath = currentPath;
  if (current && currentPath.startsWith(current.prefix)) {
    contentPath = currentPath.slice(current.prefix.length) || '/';
  }
  if (!contentPath.startsWith('/')) contentPath = '/' + contentPath;

  let newPath = next.prefix + contentPath;
  // avoid trailing slash for root
  if (contentPath === '/') newPath = next.prefix;

  localStorage.setItem('dayflow-locale', newLocale);
  window.location.href = BASE_PATH + newPath;
}

export function LanguageSwitcher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLocale = getLanguageCodeFromPathname(pathname);

  // close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className='relative'>
      <button
        type='button'
        onClick={() => setOpen(v => !v)}
        aria-label='Switch language'
        aria-expanded={open}
        className={buttonVariants({ size: 'icon-sm', color: 'ghost' })}
      >
        <Languages className='size-4' />
      </button>

      {open && (
        <div className='bg-fd-background absolute inset-e-0 top-full z-50 mt-1 w-36 rounded-lg border p-1 shadow-md'>
          {languages.map(language => (
            <button
              key={language.code}
              type='button'
              onClick={() => {
                setOpen(false);
                switchTo(language.code, pathname);
              }}
              className={`hover:bg-fd-accent hover:text-fd-accent-foreground flex w-full items-center justify-between rounded px-2 py-1 text-sm transition-colors ${
                currentLocale === language.code
                  ? 'text-fd-primary font-medium'
                  : 'text-fd-muted-foreground'
              }`}
            >
              {language.name}
              {currentLocale === language.code && (
                <svg
                  className='size-3.5'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
