'use client';

import React from 'react';
import { Tabs } from 'nextra/components';

const frameworks = [
  {
    id: 'react',
    name: 'React',
    icon: (
      <svg viewBox="-11.5 -10.23177 23 20.46354" className="w-4 h-4 inline-block mr-2">
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
    icon: (
      <svg viewBox="0 0 256 221" className="w-4 h-4 inline-block mr-2">
        <path fill="#41B883" d="M204.8 0H256L128 220.8L0 0h97.92L128 51.2L157.44 0h47.36Z" />
        <path fill="#35495E" d="M0 0l128 220.8L256 0h-51.2L128 132.48L54.4 0H0Z" />
        <path fill="#41B883" d="M97.92 0L128 51.2L158.08 0h-60.16Z" />
      </svg>
    ),
  },
  {
    id: 'angular',
    name: 'Angular',
    icon: (
      <svg viewBox="0 0 250 250" className="w-4 h-4 inline-block mr-2">
        <path fill="#DD0031" d="M125 30L31.9 63.2l14.2 123.1L125 230l78.9-43.7 14.2-123.1z" />
        <path fill="#C3002F" d="M125 30v22.2l76 2.7l-13.9 120.4L125 218.4v11.6l78.9-43.7 14.2-123.1z" />
        <path fill="#FFF" d="M125 52.1L66.8 182.6h21.7l11.7-29.2h49.4l11.7 29.2h21.8L125 52.1zm24.6 101.2h-49.2L125 94.2l24.6 59.1z" />
      </svg>
    ),
  },
  {
    id: 'svelte',
    name: 'Svelte',
    icon: (
      <svg viewBox="0 0 100 100" className="w-4 h-4 inline-block mr-2">
        <path
          fill="#FF3E00"
          d="M62.6 30.5c-3.1-4.8-10.7-3.7-12.2 2.1-1.3 5 4.3 7.8 7.3 10.2 4.1 3.3 8.3 7.2 8.3 13.5 0 11.2-11.8 17-21.7 13.5-3.1-1.1-4.6-2.9-4.7-2.9l3.5-7.7s1.3 1.1 2.9 1.7c4.6 1.6 9.3-.5 9.3-5 0-3.3-3.1-5.6-5.9-7.8-4-3.1-10.6-7.3-10.6-16.1 0-10.6 10.9-17 21-13.5 3.3 1.1 5.3 3 5.3 3l-3.3 7.7s-2.1-1.5-3.6-1.9c-4.6-1.6-9.3.5-9.3 5 0 2.2 2.1 4.1 4.1 5.6 1.8 1.4 3.7 2.8 5.3 4.3 3.6 3.4 5.9 8 5.9 13.5 0 12.5-12.3 22.8-26.6 22.8-5.7 0-10.4-1.6-10.4-1.6l3.3-7.7s3.8 1.6 7.1 1.6c8.5 0 15.3-6.1 15.3-13.5s-5.3-12.3-13.2-18.7c-4.4-3.5-10.8-7.9-10.8-17.1 0-11.8 11-20.9 24.3-20.9 6.2 0 11.3 2.1 11.3 2.1l-3.3 7.7s-3.9-2.1-8-2.1c-8.5 0-14.3 5.8-14.3 13.2 0 4.1 2.5 7.1 5.1 9.2 3.1 2.5 6.6 5.1 9.4 8.2 3.4 3.8 5.6 8.5 5.6 14 0 12.5-10.3 22.7-23 22.7-5.7 0-10.4-1.6-10.4-1.6l3.3-7.7s3.8 1.6 7.1 1.6c7.7 0 11.7-6.1 11.7-13.5 0-4.1-2.5-7.1-5.1-9.2-3.1-2.5-6.6-5.1-9.4-8.2-1.9-2.1-3.3-4.5-4-7"
        />
      </svg>
    ),
  },
];

export function FrameworkTabs({ children }: { children: React.ReactNode }) {
  const items = frameworks.map(fw => (
    <div key={fw.id} className="flex items-center">
      {fw.icon}
      <span>{fw.name}</span>
    </div>
  ));

  return (
    <Tabs items={items}>
      {children}
    </Tabs>
  );
}
