'use client';

import React from 'react';
import Link from 'next/link';
import InteractiveCalendar from './InteractiveCalendar';

export function LiveDemo() {
  return (
    <div className="mx-auto ">
      <section className="space-y-12 py-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
            Calendar toolkit for product teams
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
            Ship a polished calendar without rebuilding the basics.
          </h1>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400 sm:text-lg">
            DayFlow provides production-ready calendar views, drag-and-drop,
            and a modular architecture so you can focus on your product, not
            date math.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/docs/introduction"
              className="inline-flex items-center justify-center rounded-full bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-400"
            >
              Get started
            </Link>
            <Link
              href="https://github.com/dayflow-js/dayflow"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500/60 dark:hover:text-blue-300"
            >
              View on Github
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold">
              Try it in your browser
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Switch views, drag events, and explore the plugin architecture
              live.
            </p>
          </div>
        </div>
        <div className="overflow-hidden ">
          <InteractiveCalendar />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent px-8 py-12 text-center dark:border-slate-800 dark:from-blue-500/15 my-16">
        <h2 className="text-3xl font-semibold">Build faster with DayFlow</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Install the package, drop in the views you need, and customize the
          UI with hooks and plugins. DayFlow meets teams where they are.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center justify-center rounded-full bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-400"
          >
            Read the docs
          </Link>
          <Link
            href="https://github.com/dayflow-js/dayflow"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500/60"
          >
            Star on GitHub
          </Link>
        </div>
      </section>
    </div>
  );
}
