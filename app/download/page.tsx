import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo-config'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import DownloadClient from './DownloadClient'

export const metadata: Metadata = createMetadata({
  path: '/download',
  title: 'Download — Free Trial Installer & Portable App',
  description: 'Download Jinda POS installer and portable executable for Windows. Try all 20+ features, inventory tracking, GST compliancy, accounting ledgers offline free for 7 days.',
  keywords: [
    'Jinda POS download',
    'Jinda setup exe',
    'Bhutan accounting software download',
    'offline POS system windows',
    'download retail software Bhutan',
  ]
})

export default function DownloadPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://jindapos.com' },
          { name: 'Download', url: 'https://jindapos.com/download' },
        ]}
      />
      <DownloadClient />
    </>
  )
}
