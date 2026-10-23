'use client';

import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { Search } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * Header search controls with the docs entry attached to their left.
 *
 * fumadocs' home header renders search as the first child of its right-hand
 * group and puts every configured link either far left (main) or after the
 * theme/locale toggles (secondary), so `searchToggle.components` is the only
 * slot that can sit directly beside the search box. Rendering the link here
 * — rather than as a nav link — also keeps it in exactly one place at every
 * breakpoint, since the `lg` and `sm` slots are mutually exclusive.
 */
function DocsLink() {
  return (
    <Link
      href='/docs/introduction'
      className='text-fd-muted-foreground hover:text-fd-accent-foreground inline-flex items-center p-2 text-sm whitespace-nowrap transition-colors'
    >
      <span className='hidden sm:inline'>Documentation</span>
      <span className='sm:hidden'>Docs</span>
    </Link>
  );
}

export function HeaderSearchLarge() {
  const { setOpenSearch, enabled, hotKey } = useSearchContext();
  const { text } = useI18n();

  return (
    <>
      <Link
        href='/changelog'
        className='text-fd-muted-foreground hover:text-fd-accent-foreground inline-flex items-center gap-1.5 p-2 text-sm whitespace-nowrap transition-colors'
      >
        Changelog
        <span
          aria-hidden='true'
          className='h-1.5 w-1.5 rounded-full bg-emerald-500'
        />
      </Link>
      <DocsLink />
      {enabled && (
        <button
          type='button'
          data-search-full=''
          aria-label={text.search ?? 'Open Search'}
          onClick={() => setOpenSearch(true)}
          className='bg-fd-secondary/50 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground inline-flex w-full max-w-[240px] items-center gap-2 rounded-full border p-1.5 ps-2.5 text-sm transition-colors'
        >
          <Search className='size-4' />
          {text.search ?? 'Search'}
          <div className='ms-auto inline-flex gap-0.5'>
            {hotKey.map((key, i) => (
              <kbd
                key={i}
                className='bg-fd-background rounded-md border px-1.5'
              >
                {key.display}
              </kbd>
            ))}
          </div>
        </button>
      )}
    </>
  );
}

export function HeaderSearchCompact() {
  const { setOpenSearch, enabled } = useSearchContext();
  const { text } = useI18n();

  return (
    <>
      <Link
        href='/changelog'
        className='text-fd-muted-foreground hover:text-fd-accent-foreground inline-flex items-center gap-1.5 p-2 text-sm whitespace-nowrap transition-colors'
      >
        Changelog
        <span
          aria-hidden='true'
          className='h-1.5 w-1.5 rounded-full bg-emerald-500'
        />
      </Link>
      <DocsLink />
      {enabled && (
        <button
          type='button'
          data-search=''
          aria-label={text.search ?? 'Open Search'}
          onClick={() => setOpenSearch(true)}
          className={cn(
            buttonVariants({ size: 'icon-sm', color: 'ghost' }),
            'p-2'
          )}
        >
          <Search />
        </button>
      )}
    </>
  );
}
