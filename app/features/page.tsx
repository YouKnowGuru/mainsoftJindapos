import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo-config'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import FeaturesClient from './FeaturesClient'

export const metadata: Metadata = createMetadata({
  path: '/features',
  title: 'Features — Double-Entry Accounting, POS, GST compliance',
  description: 'Explore the complete business management suite of Jinda POS. Features include barcode sales terminal, double-entry accounting, real-time inventory tracking, automatic 5% GST computation, and custom invoicing.',
  keywords: [
    'Bhutan GST compliance software',
    'Bhutan double entry accounting',
    'mBOB integration POS',
    'sales dashboard Bhutan',
    'inventory tracker Bhutan',
    'offline billing system Bhutan',
  ]
})

export default function FeaturesPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://jindapos.com' },
          { name: 'Features', url: 'https://jindapos.com/features' },
        ]}
      />
      <FeaturesClient />
    </>
  )
}
