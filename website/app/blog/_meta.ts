import type { MetaRecord } from 'nextra';

const meta: MetaRecord = {
  index: {
    title: 'Blog',
    theme: {
      pagination: false,
    },
  },
  'v3.0': 'V3.0 (Multi-Framework)',
  'v2.0.3': 'V2.0.3',
  'v1.8': 'V1.8',
  'v1.7': 'V1.7',
  'v1.4': 'V1.4',
  'theme-customization': 'Theme Customization',
  '*': {
    theme: {
      sidebar: false,
      toc: false,
      breadcrumb: false,
      pagination: true,
    },
  },
};

export default meta;
