'use client';

import { SidebarTrigger } from 'fumadocs-ui/components/sidebar/base';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { Github, Search, Sidebar } from 'lucide-react';
import Link from 'next/link';

import { LanguageSwitcher } from './LanguageSwitcher';

function LargeSearch() {
  const { setOpenSearch, enabled } = useSearchContext();
  if (!enabled) return null;
  return (
    <button
      type='button'
      onClick={() => setOpenSearch(true)}
      className='bg-fd-secondary/50 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground inline-flex w-full max-w-[240px] items-center gap-2 rounded-lg border p-1.5 ps-2 text-sm transition-colors'
    >
      <Search className='size-4' />
      <span>Search...</span>
    </button>
  );
}

function SmallSearch() {
  const { setOpenSearch, enabled } = useSearchContext();
  if (!enabled) return null;
  return (
    <button
      type='button'
      onClick={() => setOpenSearch(true)}
      aria-label='Search'
      className={buttonVariants({ size: 'icon-sm', color: 'ghost' })}
    >
      <Search className='size-4' />
    </button>
  );
}

interface DocsHeaderProps {
  githubUrl?: string;
}

/**
 * Full-width sticky header for /docs pages that mirrors the HomeLayout nav.
 * Rendered as nav.component inside DocsLayout so it has SidebarProvider context
 * (needed for SidebarTrigger). A CSS rule in global.css makes #nd-nav fixed
 * so it escapes the grid and spans the full viewport width.
 */
export function DocsHeader({ githubUrl }: DocsHeaderProps) {
  return (
    <div style={{ gridColumn: '1 / -1', gridRow: 1, position: 'relative' }}>
      <header id='nd-nav' className='sticky top-0 z-40 h-14'>
        <div className='bg-fd-background/80 border-b backdrop-blur-lg'>
          <nav className='mx-auto flex h-14 w-full max-w-(--fd-layout-width,1400px) items-center px-4'>
            {/* Logo */}
            <Link
              href='/'
              className='me-6 inline-flex items-center gap-2.5 text-[0.9375rem] font-semibold'
            >
              DayFlow
            </Link>

            {/* Spacer */}
            <div className='flex-1 max-lg:hidden' />

            {/* Desktop right: search + language + github */}
            <div className='flex flex-row items-center gap-1.5 max-lg:hidden'>
              <LargeSearch />
              <LanguageSwitcher />
              {githubUrl && (
                <a
                  href={githubUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='GitHub'
                  className={buttonVariants({ size: 'icon', color: 'ghost' })}
                >
                  <Github className='size-4' />
                </a>
              )}
            </div>

            {/* Mobile right: search + language + sidebar trigger */}
            <div className='ms-auto flex flex-row items-center gap-1 lg:hidden'>
              <SmallSearch />
              <LanguageSwitcher />
              {githubUrl && (
                <a
                  href={githubUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='GitHub'
                  className={buttonVariants({
                    size: 'icon-sm',
                    color: 'ghost',
                  })}
                >
                  <Github className='size-4' />
                </a>
              )}
              <SidebarTrigger
                className={buttonVariants({ size: 'icon-sm', color: 'ghost' })}
                aria-label='Toggle sidebar'
              >
                <Sidebar className='size-4' />
              </SidebarTrigger>
            </div>
          </nav>
        </div>
      </header>
    </div>
  );
}
