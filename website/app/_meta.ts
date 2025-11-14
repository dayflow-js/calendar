import type { MetaRecord } from 'nextra'

const meta: MetaRecord = {
  index: {
    display: "hidden",
    theme: {
      layout: 'full',
      sidebar: false,
      toc: false,
      timestamp: false,
      breadcrumb: false,
      copyPage: false
    }
  },
  docs: {
    type: 'page',
    href: 'docs',
    title: 'Docs'
  },
  'docs-zh': {
    display: "hidden",
    type: 'page',
    href: 'docs-zh',
    title: '中文文档'
  },
  'docs-ja': {
    display: "hidden",
    type: 'page',
    href: 'docs-ja',
    title: '日本語ドキュメント'
  },
}

export default meta
