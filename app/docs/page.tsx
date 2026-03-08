import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import {
  Book,
  Video,
  FileText,
  MessageCircle,
  ChevronRight,
  ShoppingCart,
  Package,
  Calculator,
  BarChart3,
  Users,
  Settings,
} from 'lucide-react'

const docCategories = [
  {
    icon: Book,
    title: 'Getting Started',
    description: 'Learn the basics of setting up and using Dhisum Tseyig.',
    links: [
      { title: 'Installation Guide', href: '#' },
      { title: 'First Time Setup & Company Config', href: '#' },
      { title: 'Creating Your First Sale', href: '#' },
      { title: 'Adding Products to Inventory', href: '#' },
    ],
  },
  {
    icon: ShoppingCart,
    title: 'POS Operations',
    description: 'Master the point-of-sale interface for quick checkouts.',
    links: [
      { title: 'Processing a Sale', href: '#' },
      { title: 'Cart Management & Discounts', href: '#' },
      { title: 'Payment Methods (mBOB, BNB, TPay...)', href: '#' },
      { title: 'Invoice & Receipt Printing', href: '#' },
    ],
  },
  {
    icon: Package,
    title: 'Inventory Management',
    description: 'Track stock, manage categories, and handle alerts.',
    links: [
      { title: 'Adding & Editing Products', href: '#' },
      { title: 'Categories & Units', href: '#' },
      { title: 'Stock Adjustments', href: '#' },
      { title: 'Low Stock Alerts', href: '#' },
    ],
  },
  {
    icon: Calculator,
    title: 'GST Compliance',
    description: 'Understand GST calculation and returns filing.',
    links: [
      { title: 'Understanding 5% GST', href: '#' },
      { title: 'Input vs Output Tax', href: '#' },
      { title: 'Generating GSTR Reports', href: '#' },
      { title: 'Filing Status Tracking', href: '#' },
    ],
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Generate financial reports and business insights.',
    links: [
      { title: 'Trial Balance', href: '#' },
      { title: 'Profit & Loss Statement', href: '#' },
      { title: 'Balance Sheet', href: '#' },
      { title: 'Outstanding & Stock Reports', href: '#' },
    ],
  },
  {
    icon: Settings,
    title: 'Settings & Administration',
    description: 'Configure your business and manage users.',
    links: [
      { title: 'Company Settings', href: '#' },
      { title: 'User Management & Roles', href: '#' },
      { title: 'Backup & Restore', href: '#' },
      { title: 'Invoice Customization', href: '#' },
    ],
  },
]

const quickLinks = [
  { title: 'System Requirements', href: '#' },
  { title: 'License Activation', href: '/license-activate' },
  { title: 'Download Software', href: '/download' },
  { title: 'Pricing Information', href: '/pricing' },
]

import { InteractiveCard } from '@/components/InteractiveCard'

export const metadata = {
  title: 'Documentation - Dhisum Tseyig',
  description: 'Learn how to use Dhisum Tseyig POS software with our comprehensive documentation covering POS, inventory, GST, reports, and more.',
}

export default function DocsPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-bhutan-maroon-dark to-bhutan-maroon py-16 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-bhutan-gold opacity-5 blur-[120px] rounded-full" />
        <div className="container relative z-10">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold mb-4 tracking-tight">Documentation</h1>
            <p className="text-lg text-white/70">
              Everything you need to know about using Dhisum Tseyig — from setup to GST filing.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-6 border-b bg-slate-50/50">
        <div className="container">
          <div className="flex flex-wrap justify-center gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-bhutan-maroon transition-colors font-medium"
              >
                {link.title}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Doc Categories */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docCategories.map((category) => (
              <InteractiveCard key={category.title} className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bhutan-maroon/10 text-bhutan-maroon flex-shrink-0 group-hover:bg-bhutan-maroon group-hover:text-bhutan-gold transition-all duration-300 transform-style-3d group-hover:scale-110">
                    <category.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-bhutan-maroon transition-colors">{category.title}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </div>
                <ul className="space-y-2 ml-16">
                  {category.links.map((link) => (
                    <li key={link.title}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-bhutan-maroon transition-colors inline-flex items-center gap-1"
                      >
                        {link.title}
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </InteractiveCard>
            ))}
          </div>
        </div>
      </section>

      {/* Getting Started Guide */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 tracking-tight">Quick Start Guide</h2>
            <div className="space-y-6">
              {[
                {
                  step: 1,
                  title: 'Download and Install',
                  description: 'Download the latest version of Dhisum Tseyig for Windows. Run the installer and follow the on-screen instructions.',
                  link: { text: 'Go to Download Page', href: '/download' },
                },
                {
                  step: 2,
                  title: 'Activate Your License',
                  description: 'When you first launch the application, enter your license key or start a 7-day free trial.',
                  link: { text: 'Activate License', href: '/license-activate' },
                },
                {
                  step: 3,
                  title: 'Set Up Your Business',
                  description: 'Go to Settings to configure your company name, address, trade license number, GST rate, and invoice format.',
                },
                {
                  step: 4,
                  title: 'Add Products & Contacts',
                  description: 'Add your products to inventory with purchase prices, selling prices, and GST rates. Create customer and supplier profiles.',
                },
                {
                  step: 5,
                  title: 'Start Selling',
                  description: 'Use the POS screen to process sales. Search products, add to cart, select payment method (mBOB, cash, etc.), and print invoices.',
                },
              ].map((item) => (
                <div key={item.step} className="bg-card rounded-xl p-6 border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bhutan-maroon text-bhutan-gold font-bold text-sm flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground mb-3 leading-relaxed">{item.description}</p>
                      {item.link && (
                        <Link
                          href={item.link.href}
                          className="text-bhutan-maroon hover:underline inline-flex items-center gap-1 text-sm font-medium"
                        >
                          {item.link.text}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Need Help */}
      <section className="py-16">
        <div className="container">
          <div className="bg-gradient-to-r from-bhutan-maroon to-bhutan-maroon-light rounded-2xl p-8 md:p-12 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-bhutan-gold opacity-10 blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Need More Help?
              </h2>
              <p className="text-white/70 max-w-lg mx-auto mb-6">
                Our support team is available to help you get started and answer any questions about POS, inventory, GST, or reporting.
              </p>
              <Link href="/contact">
                <button className="bg-bhutan-gold text-bhutan-maroon-dark px-6 py-3 rounded-xl font-bold hover:bg-white transition-colors shadow-xl">
                  Contact Support
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
