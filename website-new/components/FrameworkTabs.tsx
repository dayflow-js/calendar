'use client';

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from 'fumadocs-ui/components/tabs';
import React from 'react';

const frameworks = [
  {
    id: 'react',
    name: 'React',
    icon: (
      <svg viewBox='-11.5 -10.23177 23 20.46354' className='h-4 w-4'>
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
    icon: (
      <svg viewBox='0 0 256 221' className='h-4 w-4'>
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
    icon: (
      <svg viewBox='0 0 250 250' className='h-4 w-4'>
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
    icon: (
      <svg viewBox='0 0 98.1 118' className='h-4 w-4'>
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

export function FrameworkTabs({ children }: { children: React.ReactNode }) {
  const childrenArray = React.Children.toArray(children);

  return (
    <Tabs defaultValue='React'>
      <TabsList>
        {frameworks.map(fw => (
          <TabsTrigger key={fw.id} value={fw.name}>
            {fw.icon}
            {fw.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {frameworks.map((fw, i) => (
        <TabsContent key={fw.id} value={fw.name}>
          {childrenArray[i]}
        </TabsContent>
      ))}
    </Tabs>
  );
}

// Simple Tab wrapper used in MDX content
export function Tab({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return children;
}
