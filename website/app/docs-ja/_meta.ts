import type { MetaRecord } from 'nextra';

const meta: MetaRecord = {
  introduction: {
    title: 'はじめに',
  },
  plugins: {
    title: 'プラグイン',
  },
  features: {
    title: '機能',
    theme: {
      layout: 'full',
      // sidebar: false,
      toc: false,
      timestamp: false,
      breadcrumb: false,
      copyPage: false,
    },
  },
  guides: {
    title: 'ガイド',
  },
};

export default meta;
