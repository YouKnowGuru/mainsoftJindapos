import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo-config'
import { BreadcrumbJsonLd, LocalBusinessJsonLd } from '@/components/seo/JsonLd'
import ContactClient from './ContactClient'

export const metadata: Metadata = createMetadata({
  path: '/contact',
  title: 'Contact Us — Support, Licensing & Inquiries',
  description: 'Get in touch with the Jinda POS team. Reach out for license activations, software setup assistance, GST configuration queries, or general business software inquiries in Bhutan.',
  keywords: [
    'contact Jinda POS',
    'Jinda POS phone number',
    'Jinda customer support',
    'Damphu Tsirang office address',
    'dhisumtseyig contact email',
  ]
})

export default function ContactPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://jindapos.com' },
          { name: 'Contact Us', url: 'https://jindapos.com/contact' },
        ]}
      />
      <LocalBusinessJsonLd />
      <ContactClient />
    </>
  )
}
