'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

import styles from './changelog.module.css';

const FILTERS = [
  { value: 'all', label: 'All updates' },
  { value: 'feature', label: 'New features' },
  { value: 'minor', label: 'Fixes & improvements' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];

/** Filter tabs over the server-rendered release list. */
export function ChangelogFeed({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<Filter>('all');
  return (
    <>
      <div className={styles.filters} role='tablist' aria-label='Filter'>
        {FILTERS.map(option => (
          <button
            key={option.value}
            type='button'
            role='tab'
            aria-selected={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className={styles.feed} data-filter={filter}>
        {children}
      </div>
    </>
  );
}
