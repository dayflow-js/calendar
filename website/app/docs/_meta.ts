import type { MetaRecord } from 'nextra';

const meta: MetaRecord = {
  introduction: {
    title: 'Introduction',
  },
  features: {
    title: 'Features',
    theme: {
      layout: 'full',
      // sidebar: false,
      toc: false,
      timestamp: false,
      breadcrumb: false,
      copyPage: false,
    },
  },
  plugins: {
    title: 'Plugins',
  },
};

export default meta;
