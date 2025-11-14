import type { MetaRecord } from 'nextra'

const meta: MetaRecord = {
  introduction: {
    title: '介绍',
  },
  features: {
    title: '功能特性',
    theme: {
      layout: 'full',
      // sidebar: false,
      toc: false,
      timestamp: false,
      breadcrumb: false,
      copyPage: false
    }
  },
  guides: {
    title: '指南',
  },
}

export default meta
