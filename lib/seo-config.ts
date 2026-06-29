import type { Metadata } from 'next'

const SITE_URL = 'https://jindapos.com'
const SITE_NAME = 'Jinda POS'
const SITE_DESCRIPTION = 'Modern POS and accounting software designed for small businesses in Bhutan. Sales, inventory, GST compliance, invoicing, reports — all in one offline desktop app.'

export const seoConfig = {
  siteUrl: SITE_URL,
  siteName: SITE_NAME,
  siteDescription: SITE_DESCRIPTION,
  locale: 'en_US',
  creator: 'Keshab Baral',
  publisher: 'Jinda POS',
  twitterHandle: '@jindapos',
  themeColor: '#7B1F3A', // bhutan-maroon
  keywords: [
    'POS software Bhutan',
    'point of sale Bhutan',
    'accounting software Bhutan',
    'Jinda POS',
    'GST Bhutan',
    'inventory management Bhutan',
    'Bhutanese business software',
    'retail software Bhutan',
    'billing software Bhutan',
    'small business software Bhutan',
    'mBOB payment',
    'BNB Pay',
    'TPay',
    'offline POS',
    'desktop POS software',
  ],
}

export function createMetadata(overrides: Partial<Metadata> & { path?: string } = {}): Metadata {
  const { path = '', ...rest } = overrides
  const url = `${SITE_URL}${path}`

  return {
    metadataBase: new URL(SITE_URL),
    title: rest.title || {
      default: `${SITE_NAME} — Modern POS & Accounting Software for Bhutan`,
      template: `%s | ${SITE_NAME}`,
    },
    description: rest.description || SITE_DESCRIPTION,
    keywords: seoConfig.keywords,
    authors: [{ name: seoConfig.creator, url: SITE_URL }],
    creator: seoConfig.creator,
    publisher: seoConfig.publisher,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: url || SITE_URL,
    },
    openGraph: {
      type: 'website',
      locale: seoConfig.locale,
      url: url || SITE_URL,
      siteName: SITE_NAME,
      title: (rest.title as string) || `${SITE_NAME} — Modern POS & Accounting Software for Bhutan`,
      description: (rest.description as string) || SITE_DESCRIPTION,
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} - POS Software for Bhutan`,
          type: 'image/png',
        },
      ],
      ...(rest.openGraph || {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: (rest.title as string) || `${SITE_NAME} — Modern POS & Accounting Software for Bhutan`,
      description: (rest.description as string) || SITE_DESCRIPTION,
      images: [`${SITE_URL}/og-image.png`],
      creator: seoConfig.twitterHandle,
      ...(rest.twitter || {}),
    },
    verification: {
      // Add your Google Search Console verification code here
      // google: 'your-google-verification-code',
    },
    category: 'technology',
    ...rest,
  }
}
