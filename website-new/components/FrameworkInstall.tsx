'use client';

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import React, { useState } from 'react';

const frameworks = [
  {
    id: 'react',
    name: 'React',
    package: '@dayflow/react',
    color: '#61DAFB',
    icon: (
      <svg viewBox='-11.5 -10.23177 23 20.46354' className='h-5 w-5'>
        <circle cx='0' cy='0' r='2.05' fill='#61DAFB' />
        <g stroke='#61DAFB' strokeWidth='1' fill='none'>
          <ellipse rx='11' ry='4.2' />
          <ellipse rx='11' ry='4.2' transform='rotate(60)' />
          <ellipse rx='11' ry='4.2' transform='rotate(120)' />
        </g>
      </svg>
    ),
  },
  {
    id: 'vue',
    name: 'Vue',
    package: '@dayflow/vue',
    color: '#41B883',
    icon: (
      <svg viewBox='0 0 256 221' className='h-5 w-5'>
        <path
          fill='#41B883'
          d='M204.8 0H256L128 220.8L0 0h97.92L128 51.2L157.44 0h47.36Z'
        />
        <path
          fill='#35495E'
          d='M0 0l128 220.8L256 0h-51.2L128 132.48L54.4 0H0Z'
        />
        <path fill='#41B883' d='M97.92 0L128 51.2L158.08 0h-60.16Z' />
      </svg>
    ),
  },
  {
    id: 'angular',
    name: 'Angular',
    package: '@dayflow/angular',
    color: '#DD0031',
    icon: (
      <svg viewBox='0 0 250 250' className='h-5 w-5'>
        <path
          fill='#DD0031'
          d='M125 30L31.9 63.2l14.2 123.1L125 230l78.9-43.7 14.2-123.1z'
        />
        <path
          fill='#C3002F'
          d='M125 30v22.2l76 2.7l-13.9 120.4L125 218.4v11.6l78.9-43.7 14.2-123.1z'
        />
        <path
          fill='#FFF'
          d='M125 52.1L66.8 182.6h21.7l11.7-29.2h49.4l11.7 29.2h21.8L125 52.1zm24.6 101.2h-49.2L125 94.2l24.6 59.1z'
        />
      </svg>
    ),
  },
  {
    id: 'svelte',
    name: 'Svelte',
    package: '@dayflow/svelte',
    color: '#FF3E00',
    icon: (
      <svg viewBox='0 0 98.1 118' className='h-5 w-5'>
        <path
          fill='#FF3E00'
          d='M91.8 15.6C80.9-.1 59.2-4.7 43.6 5.2L16.1 22.8C8.6 27.5 3.4 35.2 1.9 43.9c-1.3 7.3-.2 14.8 3.3 21.3-2.4 3.6-4 7.6-4.7 11.8-1.6 8.9.5 18.1 5.7 25.4 11 15.7 32.6 20.3 48.2 10.4l27.5-17.5c7.5-4.7 12.7-12.4 14.2-21.1 1.3-7.3.2-14.8-3.3-21.3 2.4-3.6 4-7.6 4.7-11.8 1.7-8.9-.4-18.1-5.7-25.5'
        />
        <path
          fill='#FFF'
          d='M40.9 103.9c-8.9 2.3-18.2-1.2-23.4-8.7-3.2-4.4-4.4-9.9-3.5-15.3.2-.9.4-1.7.6-2.6l.5-1.6 1.4 1c3.3 2.4 6.9 4.2 10.8 5.4l1 .3-.1 1c-.1 1.4.3 2.9 1.1 4.1 1.6 2.3 4.4 3.4 7.1 2.7.6-.2 1.2-.4 1.7-.7L65.5 72c1.4-.9 2.3-2.2 2.6-3.8.3-1.6-.1-3.3-1-4.6-1.6-2.3-4.4-3.3-7.1-2.6-.6.2-1.2.4-1.7.7l-10.5 6.7c-1.7 1.1-3.6 1.9-5.6 2.4-8.9 2.3-18.2-1.2-23.4-8.7-3.1-4.4-4.4-9.9-3.4-15.3.9-5.2 4.1-9.9 8.6-12.7l27.5-17.5c1.7-1.1 3.6-1.9 5.6-2.5 8.9-2.3 18.2 1.2 23.4 8.7 3.2 4.4 4.4 9.9 3.5 15.3-.2.9-.4 1.7-.7 2.6l-.5 1.6-1.4-1c-3.3-2.4-6.9-4.2-10.8-5.4l-1-.3.1-1c.1-1.4-.3-2.9-1.1-4.1-1.6-2.3-4.4-3.3-7.1-2.6-.6.2-1.2.4-1.7.7L32.4 46.1c-1.4.9-2.3 2.2-2.6 3.8s.1 3.3 1 4.6c1.6 2.3 4.4 3.3 7.1 2.6.6-.2 1.2-.4 1.7-.7l10.5-6.7c1.7-1.1 3.6-1.9 5.6-2.5 8.9-2.3 18.2 1.2 23.4 8.7 3.2 4.4 4.4 9.9 3.5 15.3-.9 5.2-4.1 9.9-8.6 12.7L47.2 101.5c-1.8 1.1-3.7 1.9-5.7 2.5h-.6z'
        />
      </svg>
    ),
  },
];

const InstallCommand = ({ cmd, pkg }: { cmd: string; pkg: string }) => {
  const [copied, setCopied] = useState(false);
  const command = `${cmd} ${pkg} @dayflow/core`;

  const copy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className='group relative mt-4'>
      <div className='overflow-x-auto rounded-lg bg-[#f4f5f7] p-4 text-sm font-medium whitespace-pre dark:bg-zinc-800'>
        {command}
      </div>
      <button
        type='button'
        onClick={copy}
        className='absolute top-2 right-2 rounded-md border border-border bg-white p-2 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-zinc-700'
        aria-label='Copy to clipboard'
      >
        {copied ? (
          <svg
            viewBox='0 0 24 24'
            className='h-4 w-4 text-green-500'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <polyline points='20 6 9 17 4 12' />
          </svg>
        ) : (
          <svg
            viewBox='0 0 24 24'
            className='h-4 w-4 text-muted-foreground'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <rect x='9' y='9' width='13' height='13' rx='2' ry='2' />
            <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
          </svg>
        )}
      </button>
    </div>
  );
};

export function FrameworkInstall() {
  const [activeFramework, setActiveFramework] = useState(frameworks[0]);

  return (
    <div className='my-6 overflow-hidden rounded-xl border border-border bg-background'>
      <div className='flex flex-wrap gap-2 border-b border-border bg-muted/20 p-4'>
        {frameworks.map(fw => (
          <button
            type='button'
            key={fw.id}
            onClick={() => setActiveFramework(fw)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all ${
              activeFramework.id === fw.id
                ? 'border-[#bfdbfe] bg-[#e5effe] font-medium text-blue-700 shadow-sm'
                : 'border-transparent bg-transparent text-muted-foreground hover:bg-muted'
            }`}
          >
            {fw.icon}
            <span className='text-sm font-bold'>{fw.name}</span>
          </button>
        ))}
      </div>
      <div className='p-4'>
        <Tabs items={['npm', 'pnpm', 'yarn', 'bun']}>
          <Tab value='npm'>
            <InstallCommand cmd='npm install' pkg={activeFramework.package} />
          </Tab>
          <Tab value='pnpm'>
            <InstallCommand cmd='pnpm add' pkg={activeFramework.package} />
          </Tab>
          <Tab value='yarn'>
            <InstallCommand cmd='yarn add' pkg={activeFramework.package} />
          </Tab>
          <Tab value='bun'>
            <InstallCommand cmd='bun add' pkg={activeFramework.package} />
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
