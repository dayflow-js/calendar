import React from 'react';
import { CalendarRange } from 'lucide-react';
import { DocsThemeConfig } from 'nextra-theme-docs';

const config: DocsThemeConfig = {
  logo: (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontWeight: 600,
        fontSize: '1.05rem',
        letterSpacing: '-0.02em',
      }}
    >
      <CalendarRange
        size={22}
        strokeWidth={2}
        style={{ color: '#3b82f6', flexShrink: 0 }}
      />
      <span>DayFlow</span>
    </div>
  ),
  project: {
    link: 'https://github.com/yourusername/react-calendar-package',
  },
  docsRepositoryBase:
    'https://github.com/yourusername/react-calendar-package/tree/main/website',
  footer: {
    text: 'Day Flow Documentation',
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Day Flow',
    };
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Day Flow" />
      <meta
        property="og:description"
        content="A modern Day Flow component"
      />
    </>
  ),
  primaryHue: 200,
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
};

export default config;
