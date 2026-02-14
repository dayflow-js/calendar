'use client';

import React, { useState } from 'react';
import { Tabs } from 'nextra/components';

const frameworks = [
  {
    id: 'react',
    name: 'React',
    package: '@dayflow/react',
    color: '#61DAFB',
    icon: (
      <svg viewBox="-11.5 -10.23177 23 20.46354" className="w-5 h-5">
        <circle cx="0" cy="0" r="2.05" fill="#61DAFB" />
        <g stroke="#61DAFB" strokeWidth="1" fill="none">
          <ellipse rx="11" ry="4.2" />
          <ellipse rx="11" ry="4.2" transform="rotate(60)" />
          <ellipse rx="11" ry="4.2" transform="rotate(120)" />
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
      <svg viewBox="0 0 256 221" className="w-5 h-5">
        <path
          fill="#41B883"
          d="M204.8 0H256L128 220.8L0 0h97.92L128 51.2L157.44 0h47.36Z"
        />
        <path
          fill="#35495E"
          d="M0 0l128 220.8L256 0h-51.2L128 132.48L54.4 0H0Z"
        />
        <path fill="#41B883" d="M97.92 0L128 51.2L158.08 0h-60.16Z" />
      </svg>
    ),
  },
  {
    id: 'angular',
    name: 'Angular',
    package: '@dayflow/angular',
    color: '#DD0031',
    icon: (
      <svg viewBox="0 0 250 250" className="w-5 h-5">
        <path
          fill="#DD0031"
          d="M125 30L31.9 63.2l14.2 123.1L125 230l78.9-43.7 14.2-123.1z"
        />
        <path
          fill="#C3002F"
          d="M125 30v22.2l76 2.7l-13.9 120.4L125 218.4v11.6l78.9-43.7 14.2-123.1z"
        />
        <path
          fill="#FFF"
          d="M125 52.1L66.8 182.6h21.7l11.7-29.2h49.4l11.7 29.2h21.8L125 52.1zm24.6 101.2h-49.2L125 94.2l24.6 59.1z"
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
      <svg viewBox="0 0 100 100" className="w-5 h-5">
        <path
          fill="#FF3E00"
          d="M62.6 30.5c-3.1-4.8-10.7-3.7-12.2 2.1-1.3 5 4.3 7.8 7.3 10.2 4.1 3.3 8.3 7.2 8.3 13.5 0 11.2-11.8 17-21.7 13.5-3.1-1.1-4.6-2.9-4.7-2.9l3.5-7.7s1.3 1.1 2.9 1.7c4.6 1.6 9.3-.5 9.3-5 0-3.3-3.1-5.6-5.9-7.8-4-3.1-10.6-7.3-10.6-16.1 0-10.6 10.9-17 21-13.5 3.3 1.1 5.3 3 5.3 3l-3.3 7.7s-2.1-1.5-3.6-1.9c-4.6-1.6-9.3.5-9.3 5 0 2.2 2.1 4.1 4.1 5.6 1.8 1.4 3.7 2.8 5.3 4.3 3.6 3.4 5.9 8 5.9 13.5 0 12.5-12.3 22.8-26.6 22.8-5.7 0-10.4-1.6-10.4-1.6l3.3-7.7s3.8 1.6 7.1 1.6c8.5 0 15.3-6.1 15.3-13.5s-5.3-12.3-13.2-18.7c-4.4-3.5-10.8-7.9-10.8-17.1 0-11.8 11-20.9 24.3-20.9 6.2 0 11.3 2.1 11.3 2.1l-3.3 7.7s-3.9-2.1-8-2.1c-8.5 0-14.3 5.8-14.3 13.2 0 4.1 2.5 7.1 5.1 9.2 3.1 2.5 6.6 5.1 9.4 8.2 3.4 3.8 5.6 8.5 5.6 14 0 12.5-10.3 22.7-23 22.7-5.7 0-10.4-1.6-10.4-1.6l3.3-7.7s3.8 1.6 7.1 1.6c7.7 0 11.7-6.1 11.7-13.5 0-4.1-2.5-7.1-5.1-9.2-3.1-2.5-6.6-5.1-9.4-8.2-1.9-2.1-3.3-4.5-4-7"
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
    <div className="relative group mt-4">
      <div className="p-4 rounded-lg bg-[#f4f5f7] dark:bg-zinc-800 font-mono text-sm overflow-x-auto whitespace-pre">
        <span className="text-blue-700 dark:text-blue-300">$</span> {command}
      </div>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-2 rounded-md bg-white dark:bg-zinc-700 border border-border opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-green-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
};

export function FrameworkInstall() {
  const [activeFramework, setActiveFramework] = useState(frameworks[0]);

  return (
    <div className="my-6 border border-border rounded-xl overflow-hidden bg-background">
      <div className="flex flex-wrap gap-2 p-4 border-b border-border bg-muted/20">
        {frameworks.map(fw => (
          <button
            key={fw.id}
            onClick={() => setActiveFramework(fw)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border ${
              activeFramework.id === fw.id
                ? 'bg-[#e5effe] text-blue-700 border-[#bfdbfe] shadow-sm font-medium'
                : 'bg-transparent border-transparent hover:bg-muted text-muted-foreground'
            }`}
          >
            {fw.icon}
            <span className="text-sm font-bold">{fw.name}</span>
          </button>
        ))}
      </div>
      <div className="p-4">
        <Tabs items={['npm', 'pnpm', 'yarn', 'bun']}>
          <Tabs.Tab>
            <InstallCommand cmd="npm install" pkg={activeFramework.package} />
          </Tabs.Tab>
          <Tabs.Tab>
            <InstallCommand cmd="pnpm add" pkg={activeFramework.package} />
          </Tabs.Tab>
          <Tabs.Tab>
            <InstallCommand cmd="yarn add" pkg={activeFramework.package} />
          </Tabs.Tab>
          <Tabs.Tab>
            <InstallCommand cmd="bun add" pkg={activeFramework.package} />
          </Tabs.Tab>
        </Tabs>
      </div>
    </div>
  );
}
