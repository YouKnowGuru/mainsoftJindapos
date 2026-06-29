// Reusable JSON-LD structured data components for SEO
// These inject schema.org markup that Google uses for rich results

interface JsonLdProps {
  data: Record<string, unknown>
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Jinda POS',
    url: 'https://jindapos.com',
    logo: 'https://jindapos.com/images/logo.png',
    description: 'Modern POS and accounting software designed for small businesses in Bhutan.',
    founder: {
      '@type': 'Person',
      name: 'Keshab Baral',
      jobTitle: 'Lead Systems Developer',
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'BT',
      addressLocality: 'Bhutan',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: 'https://jindapos.com/contact',
    },
    sameAs: [],
  }

  return <JsonLd data={data} />
}

export function WebSiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Jinda POS',
    url: 'https://jindapos.com',
    description: 'Modern POS and accounting software designed for small businesses in Bhutan.',
    publisher: {
      '@type': 'Organization',
      name: 'Jinda POS',
      logo: {
        '@type': 'ImageObject',
        url: 'https://jindapos.com/images/logo.png',
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://jindapos.com/docs?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return <JsonLd data={data} />
}

export function SoftwareApplicationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Jinda POS',
    description: 'Modern POS and accounting software designed for small businesses in Bhutan. Sales, inventory, GST compliance, invoicing, reports — all in one offline desktop app.',
    url: 'https://jindapos.com',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Windows 10+',
    softwareVersion: '1.0.0',
    downloadUrl: 'https://jindapos.com/download',
    screenshot: 'https://jindapos.com/images/logo.png',
    author: {
      '@type': 'Organization',
      name: 'Jinda POS',
      url: 'https://jindapos.com',
    },
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'BTN',
        name: 'Free Trial',
        description: '7-day free trial with all features',
        availability: 'https://schema.org/InStock',
      },
    ],
    featureList: [
      'POS Sales with barcode scanning',
      'Inventory Management',
      'GST Compliance (5% auto-calculation)',
      'Professional Invoicing',
      'Financial Reports (P&L, Balance Sheet, Trial Balance)',
      'Customer & Supplier Management',
      'Bhutanese Payment Methods (mBOB, BNB Pay, TPay, DrukPNB)',
      'Purchase Orders & Quotations',
      'Cloud Backup (Google Drive, MEGA)',
      'Offline Functionality',
    ],
  }

  return <JsonLd data={data} />
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return <JsonLd data={data} />
}

export function FAQPageJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return <JsonLd data={data} />
}

export function LocalBusinessJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Jinda POS',
    url: 'https://jindapos.com',
    logo: 'https://jindapos.com/images/logo.png',
    description: 'POS and accounting software provider for Bhutanese businesses.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'BT',
      addressLocality: 'Bhutan',
    },
    priceRange: 'Free - Premium',
  }

  return <JsonLd data={data} />
}
