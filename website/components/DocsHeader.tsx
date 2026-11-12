'use client';

import { SidebarTrigger } from 'fumadocs-ui/components/sidebar/base';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Sidebar } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { proUrl, schedulerUrl } from '@/lib/site';
import { cn } from '@/lib/utils';

import { LanguageSwitcher } from './LanguageSwitcher';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const PRO_URL = proUrl('docs_nav');
const SCHEDULER_URL = schedulerUrl('docs_nav');

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      role='img'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
      fill='currentColor'
      className={className}
    >
      <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      fill='currentColor'
      viewBox='3 3 18 18'
      height='24'
      aria-label='Project repository'
      className={className}
    >
      <path d='M12 3C7.0275 3 3 7.12937 3 12.2276C3 16.3109 5.57625 19.7597 9.15374 20.9824C9.60374 21.0631 9.77249 20.7863 9.77249 20.5441C9.77249 20.3249 9.76125 19.5982 9.76125 18.8254C7.5 19.2522 6.915 18.2602 6.735 17.7412C6.63375 17.4759 6.19499 16.6569 5.8125 16.4378C5.4975 16.2647 5.0475 15.838 5.80124 15.8264C6.51 15.8149 7.01625 16.4954 7.18499 16.7723C7.99499 18.1679 9.28875 17.7758 9.80625 17.5335C9.885 16.9337 10.1212 16.53 10.38 16.2993C8.3775 16.0687 6.285 15.2728 6.285 11.7432C6.285 10.7397 6.63375 9.9092 7.20749 9.26326C7.1175 9.03257 6.8025 8.08674 7.2975 6.81794C7.2975 6.81794 8.05125 6.57571 9.77249 7.76377C10.4925 7.55615 11.2575 7.45234 12.0225 7.45234C12.7875 7.45234 13.5525 7.55615 14.2725 7.76377C15.9937 6.56418 16.7475 6.81794 16.7475 6.81794C17.2424 8.08674 16.9275 9.03257 16.8375 9.26326C17.4113 9.9092 17.76 10.7281 17.76 11.7432C17.76 15.2843 15.6563 16.0687 13.6537 16.2993C13.98 16.5877 14.2613 17.1414 14.2613 18.0065C14.2613 19.2407 14.25 20.2326 14.25 20.5441C14.25 20.7863 14.4188 21.0746 14.8688 20.9824C16.6554 20.364 18.2079 19.1866 19.3078 17.6162C20.4077 16.0457 20.9995 14.1611 21 12.2276C21 7.12937 16.9725 3 12 3Z' />
    </svg>
  );
}

const DISCORD_URL = 'https://discord.gg/9vdFZKJqBb';

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
    <div style={{ gridArea: 'banner', position: 'relative' }}>
      <header id='nd-nav' className='sticky top-0 z-40 h-14'>
        <div className='bg-fd-background/80 border-b backdrop-blur-lg'>
          <nav className='mx-auto flex h-14 w-full max-w-(--fd-layout-width,1400px) items-center px-4'>
            {/* Logo */}
            <Link
              href='/'
              className='me-6 inline-flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white'
            >
              <Image
                src={`${BASE}/logo.png`}
                alt='DayFlow logo'
                width={486}
                height={424}
                className='h-7 w-auto'
              />
              DayFlow
            </Link>

            {/* Spacer */}
            <div className='flex-1 max-lg:hidden' />

            {/* Desktop right: language + discord + github */}
            <div className='flex flex-row items-center gap-1.5 max-lg:hidden'>
              <a
                href={PRO_URL}
                target='_blank'
                rel='noopener noreferrer'
                className={cn(
                  buttonVariants({ color: 'ghost' }),
                  'gap-2 px-2 text-sm font-medium text-slate-600 dark:text-slate-400'
                )}
              >
                <Image
                  src={`${BASE}/pro-logo.png`}
                  alt='DayFlow Pro logo'
                  width={1254}
                  height={1254}
                  className='h-6 w-auto'
                />
                <Badge
                  variant='outline'
                  className='border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] font-bold tracking-[0.16em] text-amber-700 uppercase dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200'
                >
                  Pro
                </Badge>
              </a>
              <a
                href={SCHEDULER_URL}
                target='_blank'
                rel='noopener noreferrer'
                className={cn(
                  buttonVariants({ color: 'ghost' }),
                  'gap-2 px-2 text-sm font-medium text-slate-600 dark:text-slate-400'
                )}
              >
                <Image
                  src={`${BASE}/schedule-logo.png`}
                  alt='Dayflow Scheduler logo'
                  width={1254}
                  height={1254}
                  className='h-6 w-auto'
                />
                <Badge
                  variant='outline'
                  className='border-sky-200 bg-sky-50 px-1.5 py-0 text-[10px] font-bold tracking-[0.12em] text-sky-700 uppercase dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200'
                >
                  Scheduler
                </Badge>
              </a>
              <a
                href='https://blossom.dayflow.studio'
                target='_blank'
                rel='noopener noreferrer'
                className={cn(
                  buttonVariants({ color: 'ghost' }),
                  'gap-2 px-2 text-sm font-medium text-slate-600 dark:text-slate-400'
                )}
              >
                <span aria-hidden='true'>🌸</span>
                <Badge
                  variant='outline'
                  className='border-pink-200 bg-pink-50 px-1.5 py-0 text-[10px] font-bold tracking-[0.08em] text-pink-700 uppercase dark:border-pink-400/30 dark:bg-pink-400/10 dark:text-pink-200'
                >
                  Blossom Color Picker
                </Badge>
              </a>
              <LanguageSwitcher />
              <a
                href={DISCORD_URL}
                target='_blank'
                rel='noopener noreferrer'
                aria-label='Discord'
                className={buttonVariants({ size: 'icon', color: 'ghost' })}
              >
                <DiscordIcon className='size-4' />
              </a>
              {githubUrl && (
                <a
                  href={githubUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='GitHub'
                  className={buttonVariants({ size: 'icon', color: 'ghost' })}
                >
                  <GithubIcon className='size-4' />
                </a>
              )}
            </div>

            {/* Mobile right: language + sidebar trigger */}
            <div className='ms-auto flex flex-row items-center gap-1 lg:hidden'>
              <a
                href='https://blossom.dayflow.studio'
                target='_blank'
                rel='noopener noreferrer'
                className={cn(
                  buttonVariants({ color: 'ghost', size: 'sm' }),
                  'text-xs font-medium text-slate-600 dark:text-slate-400'
                )}
              >
                🌸
              </a>
              <a
                href={PRO_URL}
                target='_blank'
                rel='noopener noreferrer'
                className={cn(
                  buttonVariants({ color: 'ghost', size: 'sm' }),
                  'gap-1 px-2 text-slate-600 dark:text-slate-400'
                )}
              >
                <Image
                  src={`${BASE}/pro-logo.png`}
                  alt='DayFlow Pro logo'
                  width={1254}
                  height={1254}
                  className='h-3 w-auto'
                />
                <Badge
                  variant='outline'
                  className='border-amber-200 bg-amber-50 px-1 py-0 text-[9px] font-bold tracking-[0.14em] text-amber-700 uppercase dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200'
                >
                  Pro
                </Badge>
              </a>
              <a
                href={SCHEDULER_URL}
                target='_blank'
                rel='noopener noreferrer'
                aria-label='Dayflow Scheduler'
                className={cn(
                  buttonVariants({ color: 'ghost', size: 'sm' }),
                  'gap-1 px-2 text-slate-600 dark:text-slate-400'
                )}
              >
                <Image
                  src={`${BASE}/schedule-logo.png`}
                  alt=''
                  width={1254}
                  height={1254}
                  className='h-4 w-auto'
                />
                <Badge
                  variant='outline'
                  className='hidden border-sky-200 bg-sky-50 px-1 py-0 text-[9px] font-bold tracking-[0.1em] text-sky-700 uppercase min-[560px]:inline-flex dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200'
                >
                  Scheduler
                </Badge>
              </a>
              <LanguageSwitcher />
              <a
                href={DISCORD_URL}
                target='_blank'
                rel='noopener noreferrer'
                aria-label='Discord'
                className={buttonVariants({ size: 'icon-sm', color: 'ghost' })}
              >
                <DiscordIcon className='size-4' />
              </a>
              {githubUrl && (
                <a
                  href={githubUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='GitHub'
                  // className='inline-flex size-7 items-center justify-center rounded-full bg-[#24292e] text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-[#24292e]'
                >
                  <GithubIcon className='size-3.5' />
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
