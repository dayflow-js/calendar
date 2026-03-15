'use client';

import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Languages } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const locales = [
  { code: 'en', name: 'English', prefix: '/docs' },
  { code: 'zh', name: '中文', prefix: '/docs-zh' },
  { code: 'ja', name: '日本語', prefix: '/docs-ja' },
];

function getLocaleFromPath(path: string) {
  if (path.startsWith('/docs-zh')) return 'zh';
  if (path.startsWith('/docs-ja')) return 'ja';
  return 'en';
}

function switchTo(newLocale: string, currentPath: string) {
  const current = locales.find(l => l.code === getLocaleFromPath(currentPath));
  const next = locales.find(l => l.code === newLocale);
  if (!next) return;

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
  window.location.href = newPath;
}

export function LanguageSwitcher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLocale = getLocaleFromPath(pathname);

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
        <div className='bg-fd-background absolute end-0 top-full z-50 mt-1 w-36 rounded-lg border py-1 shadow-md'>
          {locales.map(locale => (
            <button
              key={locale.code}
              type='button'
              onClick={() => {
                setOpen(false);
                switchTo(locale.code, pathname);
              }}
              className={`hover:bg-fd-accent hover:text-fd-accent-foreground flex w-full items-center justify-between px-3 py-1.5 text-sm transition-colors ${
                currentLocale === locale.code
                  ? 'text-fd-primary font-medium'
                  : 'text-fd-muted-foreground'
              }`}
            >
              {locale.name}
              {currentLocale === locale.code && (
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
