import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo-config'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import HomeClient from './HomeClient'

export const metadata: Metadata = createMetadata({
  path: '/',
  title: 'Jinda POS — Modern POS & Accounting Software for Bhutanese Businesses',
  description: 'Jinda is the #1 POS and accounting software built for Bhutan. Manage sales, inventory, GST compliance, invoicing, and financial reports — all offline. Supports mBOB, BNB Pay, TPay, DrukPNB. Free 7-day trial.',
  keywords: [
    'POS software Bhutan',
    'Jinda POS',
    'point of sale Bhutan',
    'accounting software Bhutan',
    'GST Bhutan software',
    'inventory management Bhutan',
    'billing software Bhutan',
    'Bhutanese business software',
    'offline POS',
    'mBOB payment POS',
    'BNB Pay POS',
    'TPay POS',
    'small business software Bhutan',
    'retail POS Bhutan',
    'desktop accounting Bhutan',
  ],
})

export default function HomePage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://jindapos.com' },
        ]}
      />
      <HomeClient />
    </>
  )
}
