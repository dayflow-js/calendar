import type { MetaRecord } from 'nextra';

const meta: MetaRecord = {
  introduction: {
    title: 'はじめに',
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
  plugins: {
    title: 'プラグイン',
  },
  guides: {
    title: 'ガイド',
  },
};

export default meta;
