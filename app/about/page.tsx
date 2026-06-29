import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo-config'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import AboutClient from './AboutClient'

export const metadata: Metadata = createMetadata({
  path: '/about',
  title: 'About Us — The Team Behind Jinda POS',
  description: 'Learn about Jinda POS, built specifically for Bhutanese small businesses. Read our mission, explore our 20+ features, and meet our founder Keshab Baral.',
  keywords: [
    'Jinda POS Bhutan',
    'Keshab Baral',
    'POS software developer Bhutan',
    'Tsirang Bhutan software',
    'Bhutan POS development team',
    'Bhutan point of sale history',
  ]
})

export default function AboutPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://jindapos.com' },
          { name: 'About Us', url: 'https://jindapos.com/about' },
        ]}
      />
      <AboutClient />
    </>
  )
}
