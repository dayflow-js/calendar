import type { MetaRecord } from 'nextra'

const meta: MetaRecord = {
  index: {
    title: 'Blog',
    theme: {
      pagination: false
    }
  },
  'v1.7': 'V1.7',
  'v1.4': 'V1.4',
  'theme-customization': 'Theme Customization',
  '*': {
    theme: {
      sidebar: false,
      toc: false,
      breadcrumb: false,
      pagination: true
    }
  }
}

export default meta