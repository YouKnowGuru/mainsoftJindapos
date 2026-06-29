import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo-config'
import { BreadcrumbJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd'
import PricingClient from './PricingClient'

export const metadata: Metadata = createMetadata({
  path: '/pricing',
  title: 'Pricing — POS Plans & 7-Day Free Trial',
  description: 'View pricing plans for Jinda POS software. A 7-day free trial is available with all features, unlimited products, GST compliance, and local payments support. No credit card required.',
  keywords: [
    'Jinda POS pricing',
    'Bhutan POS cost',
    'accounting software price Bhutan',
    'free trial POS software Bhutan',
    'GST billing software price',
  ]
})

const faqs = [
  {
    question: 'Does Jinda POS work without internet?',
    answer: 'Yes! Jinda runs entirely on your computer. No internet needed for sales, inventory, printing, or reports. Your data is stored locally in a secure SQLite database.',
  },
  {
    question: 'Is GST automatically calculated in Jinda?',
    answer: 'Yes. The software automatically applies 5% GST on taxable sales as per Bhutanese law. You can also generate monthly GST return reports ready for government filing.',
  },
  {
    question: 'What Bhutanese payment methods are supported?',
    answer: 'Jinda POS records all Bhutanese payment types: mBOB, BNB Pay, TPay, DrukPNB, BDBL, Druk Bank, cash, card, bank transfer, and credit (udhaaro).',
  },
  {
    question: 'Can I upgrade my license plan later?',
    answer: 'Yes. You can upgrade anytime by contacting us. Your data is always preserved when switching plans.',
  },
  {
    question: 'Is there really a free trial for Jinda POS?',
    answer: 'Yes — 7 days, full features, no credit card required. Download and start using immediately.',
  },
  {
    question: 'How do data backups work in Jinda POS?',
    answer: 'You can create manual backups with one click. The software also supports automatic cloud backups to Google Drive and MEGA if you enable them.',
  },
]

export default function PricingPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://jindapos.com' },
          { name: 'Pricing', url: 'https://jindapos.com/pricing' },
        ]}
      />
      <FAQPageJsonLd faqs={faqs} />
      <PricingClient />
    </>
  )
}
