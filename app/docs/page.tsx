import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import {
  Book,
  FileText,
  MessageCircle,
  ChevronRight,
  ShoppingCart,
  Package,
  Calculator,
  BarChart3,
  Users,
  Settings,
  Receipt,
  CreditCard,
  QrCode,
  RefreshCw,
  Briefcase,
  Tag,
  Building2,
  ArrowLeftRight,
  DollarSign,
  Clock,
  Shield,
  Printer
} from 'lucide-react'

const docCategories = [
  {
    icon: Book,
    title: 'Getting Started',
    description: 'Install, activate license, and set up your business.',
    links: [
      { title: 'System Requirements', href: '/docs#requirements' },
      { title: 'Download & Install', href: '/download' },
      { title: 'Activate Your License', href: '/license-activate' },
      { title: 'Company Settings Setup', href: '/docs#settings' },
    ],
  },
  {
    icon: ShoppingCart,
    title: 'POS Sales',
    description: 'Process sales, scan barcodes, manage the cart.',
    links: [
      { title: 'Making a Sale', href: '/docs#pos-sale' },
      { title: 'Barcode Scanning', href: '/docs#pos-barcode' },
      { title: 'Hold & Resume Cart', href: '/docs#pos-hold' },
      { title: 'Payment Methods', href: '/docs#pos-payments' },
    ],
  },
  {
    icon: Package,
    title: 'Inventory',
    description: 'Add products, track stock, manage categories.',
    links: [
      { title: 'Add Products', href: '/docs#inventory-add' },
      { title: 'Categories & Units', href: '/docs#inventory-categories' },
      { title: 'Stock Adjustments', href: '/docs#inventory-adjust' },
      { title: 'Barcode Management', href: '/docs#inventory-barcode' },
    ],
  },
  {
    icon: Users,
    title: 'Customers & Suppliers',
    description: 'Manage contacts, credit limits, and ledgers.',
    links: [
      { title: 'Add Customers & Suppliers', href: '/docs#contacts-add' },
      { title: 'Credit Limits', href: '/docs#contacts-credit' },
      { title: 'View Customer Ledger', href: '/docs#contacts-ledger' },
      { title: 'Customer Statements', href: '/docs#contacts-statement' },
    ],
  },
  {
    icon: Calculator,
    title: 'GST Compliance',
    description: 'GST calculation, monthly returns, filing.',
    links: [
      { title: 'How GST Works', href: '/docs#gst-overview' },
      { title: 'Monthly GST Summary', href: '/docs#gst-summary' },
      { title: 'Generate GST Return', href: '/docs#gst-return' },
      { title: 'GST Filing Status', href: '/docs#gst-status' },
    ],
  },
  {
    icon: BarChart3,
    title: 'Reports',
    description: 'Financial reports and business analytics.',
    links: [
      { title: 'Trial Balance', href: '/docs#report-tb' },
      { title: 'Profit & Loss', href: '/docs#report-pl' },
      { title: 'Balance Sheet', href: '/docs#report-bs' },
      { title: 'Stock & Outstanding', href: '/docs#report-stock' },
    ],
  },
  {
    icon: Receipt,
    title: 'Purchase Orders & Quotations',
    description: 'Order from suppliers and send price quotes.',
    links: [
      { title: 'Create Purchase Order', href: '/docs#po-create' },
      { title: 'Receive Inventory', href: '/docs#po-receive' },
      { title: 'Create Quotation', href: '/docs#quote-create' },
      { title: 'Convert Quote to Sale', href: '/docs#quote-convert' },
    ],
  },
  {
    icon: ArrowLeftRight,
    title: 'Transactions & Expenses',
    description: 'Record payments, transfers, and expenses.',
    links: [
      { title: 'Receive & Make Payments', href: '/docs#txn-payments' },
      { title: 'Fund Transfers', href: '/docs#txn-transfer' },
      { title: 'Record Expenses', href: '/docs#txn-expenses' },
      { title: 'Void Transactions', href: '/docs#txn-void' },
    ],
  },
  {
    icon: Settings,
    title: 'Settings & Admin',
    description: 'Company info, users, backups, license.',
    links: [
      { title: 'Company Settings', href: '/docs#settings-company' },
      { title: 'User Management', href: '/docs#settings-users' },
      { title: 'Backup & Restore', href: '/docs#settings-backup' },
      { title: 'Cloud Backup (Drive/MEGA)', href: '/docs#settings-cloud' },
    ],
  },
  {
    icon: Shield,
    title: 'Advanced Features',
    description: 'Payroll, branches, tiered pricing, audit trail.',
    links: [
      { title: 'Employee & Payroll', href: '/docs#adv-payroll' },
      { title: 'Branch Management', href: '/docs#adv-branches' },
      { title: 'Tiered Pricing', href: '/docs#adv-pricing' },
      { title: 'Audit Trail', href: '/docs#adv-audit' },
    ],
  },
]

const quickLinks = [
  { title: 'System Requirements', href: '/download' },
  { title: 'License Activation', href: '/license-activate' },
  { title: 'Download Software', href: '/download' },
  { title: 'Pricing Plans', href: '/pricing' },
  { title: 'Contact Support', href: '/contact' },
]

import { InteractiveCard } from '@/components/InteractiveCard'

export const metadata = {
  title: 'Documentation - Jinda POS Software',
  description: 'Learn how to use Jinda — POS, inventory, GST, reports, payroll, and more.',
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
              Step-by-step guides for every feature. From setup to daily operations.
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
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-black mb-3 tracking-tight">Browse by Topic</h2>
            <p className="text-sm text-muted-foreground font-medium">Select a category to find detailed guides.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docCategories.map((category) => (
              <InteractiveCard key={category.title} className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bhutan-maroon/10 text-bhutan-maroon flex-shrink-0 group-hover:bg-bhutan-maroon group-hover:text-bhutan-gold transition-all duration-300">
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

      {/* Quick Start Guide */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 tracking-tight">Quick Start Guide</h2>
            <div className="space-y-6">
              {[
                {
                  step: 1,
                  title: 'Download & Install',
                  description: 'Download Jinda for Windows. Run the installer and follow the prompts. Takes about 2 minutes.',
                  link: { text: 'Go to Download Page', href: '/download' },
                },
                {
                  step: 2,
                  title: 'Activate Your License',
                  description: 'On first launch, enter your license key or start a 7-day free trial. No credit card needed.',
                  link: { text: 'Activate License', href: '/license-activate' },
                },
                {
                  step: 3,
                  title: 'Set Up Your Business',
                  description: 'Go to Settings to enter your company name, address, trade license, and GST details.',
                },
                {
                  step: 4,
                  title: 'Add Products & Contacts',
                  description: 'Add your products with prices and GST settings. Create customer and supplier profiles.',
                },
                {
                  step: 5,
                  title: 'Start Selling',
                  description: 'Open the POS screen. Search or scan products, add to cart, select payment method, and print the invoice.',
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
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Need Help?</h2>
              <p className="text-white/70 max-w-lg mx-auto mb-6">
                Contact our support team for setup help, GST questions, or any technical issue.
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
