import type { MetaRecord } from 'nextra';

const meta: MetaRecord = {
  introduction: {
    title: 'Introduction',
  },
  plugins: {
    title: 'Plugins',
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
};

export default meta;
