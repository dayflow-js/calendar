import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import React from 'react';

import { DocsHeader } from '@/components/DocsHeader';
import { baseOptions } from '@/lib/layout.shared';
import { sourceZh } from '@/lib/source';

export default function Layout({ children }: LayoutProps<'/docs-zh'>) {
  return (
    <DocsLayout
      tree={sourceZh.getPageTree()}
      {...baseOptions()}
      nav={{ component: <DocsHeader githubUrl={baseOptions().githubUrl} /> }}
      searchToggle={{ enabled: false }}
      sidebar={{ collapsible: false }}
      containerProps={{
        style: { '--fd-banner-height': '56px' } as React.CSSProperties,
      }}
    >
      {children}
    </DocsLayout>
  );
}
