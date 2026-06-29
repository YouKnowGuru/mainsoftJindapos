import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo-config'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import SecurityClient from './SecurityClient'

export const metadata: Metadata = createMetadata({
  path: '/security',
  title: 'Security — Hashed Passwords & AES-256 Backups',
  description: 'Learn about Jinda POS security architecture. All data remains locally stored. Includes bcrypt password hashing, AES-256-GCM authenticated tokens, custom employee access controls, and encrypted cloud backups.',
  keywords: [
    'Jinda POS security',
    'offline databases security Bhutan',
    'encrypted POS software',
    'AES-256 backup encryption',
    'bcrypt password hashing POS',
    'employee access control POS',
  ]
})

export default function SecurityPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://jindapos.com' },
          { name: 'Security', url: 'https://jindapos.com/security' },
        ]}
      />
      <SecurityClient />
    </>
  )
}
