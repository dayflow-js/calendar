'use client';

import Link from 'next/link';
import React from 'react';

import InteractiveCalendarComponent from './InteractiveCalendarComponent';

export function LiveDemo() {
  return (
    <div className='landingPage mx-auto px-0 sm:px-12'>
      <section className='space-y-12 py-8'>
        <div className='mx-auto text-center'>
          <span className='inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'>
            Calendar toolkit for product teams
          </span>
          <h1 className='mt-6 text-3xl font-semibold leading-tight sm:text-5xl px-6'>
            A lightweight and elegant full calendar component for the web
          </h1>
          <p className='mt-4 text-base text-slate-600 dark:text-slate-400 sm:text-lg'>
            DayFlow provides production-ready calendar views, drag-and-drop, and
            a modular architecture so you can focus on your product, not date
            math.
          </p>
          <div className='mt-8 flex flex-wrap items-center justify-center gap-4'>
            <Link
              href='/docs/introduction'
              className='inline-flex items-center justify-center rounded-full bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-400'
            >
              Get started
            </Link>
            <Link
              href='https://github.com/dayflow-js/dayflow'
              className='inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500/60 dark:hover:text-blue-300'
            >
              View on GitHub
            </Link>
          </div>
        </div>
      </section>

      <section className='space-y-6 py-4'>
        <div className='overflow-hidden '>
          <InteractiveCalendarComponent />
        </div>
      </section>
    </div>
  );
}
