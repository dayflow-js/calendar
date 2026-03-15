import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export const gitConfig = {
  user: 'dayflow-js',
  repo: 'dayflow',
  branch: 'main',
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'DayFlow',
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    // links: [
    //   { text: 'Docs', url: '/docs' },
    //   { text: 'Blog', url: '/blog' },
    //   { text: '日本語', url: '/docs-ja' },
    //   { text: '中文', url: '/docs-zh' },
    // ],
  };
}

export function homeOptions(): BaseLayoutProps {
  return {
    ...baseOptions(),
    nav: {
      ...baseOptions().nav,
      children: <LanguageSwitcher />,
    },
  };
}
