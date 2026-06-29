import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo-config'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import DocsClient from './DocsClient'

export const metadata: Metadata = createMetadata({
  path: '/docs',
  title: 'Documentation — Step-by-Step Software Guides',
  description: 'Learn how to use Jinda. Complete guides on system requirements, installation, license activation, POS sales, inventory setup, customer ledgers, and monthly GST filing in Bhutan.',
  keywords: [
    'Jinda documentation',
    'Bhutan accounting software guide',
    'GST filing instructions Jinda',
    'POS terminal troubleshooting Bhutan',
    'SQLite backup instructions Jinda',
  ]
})

export default function DocsPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://jindapos.com' },
          { name: 'Documentation', url: 'https://jindapos.com/docs' },
        ]}
      />
      <DocsClient />
    </>
  )
}
