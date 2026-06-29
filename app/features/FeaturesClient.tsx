'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  ShoppingCart, Receipt, BarChart3, Users, Package, Calculator,
  Shield, Zap, Database, Wallet, Clock, Printer, Truck, FileText,
  TrendingUp, Settings, RefreshCw, ArrowLeftRight, CreditCard,
  Briefcase, Building2, DollarSign, QrCode, FolderClock, Tag
} from 'lucide-react'
import { InteractiveCard } from '@/components/InteractiveCard'
import { Badge } from '@/components/ui/badge'

const mainFeatures = [
  {
    icon: ShoppingCart,
    title: 'Point of Sale (POS)',
    description: 'Fast checkout with barcode scanner support. Add items to cart, apply discounts, and accept payments in seconds.',
    highlights: ['Barcode scanning', 'Cart hold & resume', 'Discount support', 'Multiple payment modes', 'Instant receipt printing'],
  },
  {
    icon: Package,
    title: 'Inventory Management',
    description: 'Track all products with real-time stock levels. Get alerts when items run low and manage categories easily.',
    highlights: ['Real-time stock tracking', 'Low stock alerts', 'Categories & units', 'Opening stock setup', 'Stock adjustments'],
  },
  {
    icon: Calculator,
    title: 'GST Compliance',
    description: 'Automatic 5% GST on taxable sales. Generate monthly GST returns ready for filing with the government.',
    highlights: ['Auto GST calculation', 'Input & output tracking', 'Monthly GST returns', 'Print & file reports'],
  },
  {
    icon: Receipt,
    title: 'Invoicing & Billing',
    description: 'Create professional invoices with your logo and business details. Track paid, unpaid, and partial payments.',
    highlights: ['Custom branded invoices', '4 print templates', 'Thermal receipt support', 'Duplicate invoice printing'],
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Make smart decisions with financial reports: Trial Balance, Profit & Loss, Balance Sheet, and Stock Valuation.',
    highlights: ['Trial Balance', 'Profit & Loss', 'Balance Sheet', 'Outstanding report', 'Stock report'],
  },
  {
    icon: Users,
    title: 'Customers & Suppliers',
    description: 'Manage contacts with credit limits, payment history, and outstanding balances. View full ledgers per contact.',
    highlights: ['Customer & supplier ledgers', 'Credit limit tracking', 'Payment history', 'Customer statements'],
  },
]

const additionalFeatures = [
  {
    icon: FileText,
    title: 'Purchase Orders',
    description: 'Create and track purchase orders from suppliers. Receive inventory and auto-create payment entries.',
  },
  {
    icon: CreditCard,
    title: 'Quotations',
    description: 'Send price quotes to customers. Convert accepted quotations directly into POS sales.',
  },
  {
    icon: RefreshCw,
    title: 'Refunds & Returns',
    description: 'Process product returns linked to original sales. Track refund reasons and export refund records.',
  },
  {
    icon: Wallet,
    title: 'Bhutanese Payments',
    description: 'Record payments via mBOB, BNB Pay, TPay, bank transfer, card, cash, and credit (udhaaro).',
  },
  {
    icon: Database,
    title: 'Double-Entry Accounting',
    description: 'Every sale, payment, and transfer is recorded with proper debit/credit entries for financial accuracy.',
  },
  {
    icon: TrendingUp,
    title: 'Expense Tracker',
    description: 'Record daily expenses by category and payment method. See total spending at a glance.',
  },
  {
    icon: Clock,
    title: 'Recurring Transactions',
    description: 'Automate regular income and expense entries. Set daily, weekly, monthly, or yearly schedules.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Fund Transfers',
    description: 'Move money between accounts — cash to bank, bank to cash — with full audit trail.',
  },
  {
    icon: DollarSign,
    title: 'Aged Reports',
    description: 'See who owes you and how long. Customer and supplier aging buckets: Current, 30, 60, 90+ days.',
  },
  {
    icon: Tag,
    title: 'Tiered Pricing',
    description: 'Set different prices for different customer types — wholesale, retail, dealer — all automatic at POS.',
  },
  {
    icon: QrCode,
    title: 'Barcode Management',
    description: 'Map product barcodes to items. Print barcode labels. Scan to sell — works with any USB barcode scanner.',
  },
  {
    icon: Briefcase,
    title: 'Employee & Payroll',
    description: 'Manage employee records and process monthly payroll. Email payslips and track payment history.',
  },
  {
    icon: Building2,
    title: 'Branch Management',
    description: 'Add and manage multiple business branches from one system.',
  },
  {
    icon: Shield,
    title: 'Audit Trail',
    description: 'Track every action — logins, sales, deletions, edits. See who did what and when. Export full audit logs.',
  },
  {
    icon: FolderClock,
    title: 'Backup & Restore',
    description: 'Create local backups and restore from cloud storage (Google Drive, MEGA). Schedule automatic backups.',
  },
  {
    icon: Zap,
    title: 'Offline-First Design',
    description: 'Runs entirely on your computer. No internet needed for daily operations. Your data stays with you.',
  },
]

const paymentMethods = [
  'mBOB', 'BNB Pay', 'TPay', 'DrukPNB', 'BDBL', 'DKBank', 'Cash', 'Card', 'Bank Transfer', 'Credit'
]

export default function FeaturesClient() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-bhutan-maroon-dark to-bhutan-maroon py-10 md:py-14 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-bhutan-gold opacity-5 blur-[80px] md:blur-[120px] rounded-full" />
        <div className="container relative z-10 px-4 md:px-6">
          <div className="max-w-2xl">
            <Badge className="bg-bhutan-gold/20 text-bhutan-gold border-none px-3 py-1 rounded-full font-black tracking-widest uppercase text-[9px] mb-3">All Features</Badge>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black mb-3 tracking-tight leading-tight">Everything You Need to Run Your Business</h1>
            <p className="text-xs md:text-sm text-white/70 leading-relaxed font-medium">
              From quick sales to full accounting — 20+ features built for Bhutanese businesses.
            </p>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-10 md:py-14">
        <div className="container px-4 md:px-6">
          <div className="text-center max-w-xl mx-auto mb-8 md:mb-10">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black mb-3 tracking-tight">Core Modules</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground font-medium">
              The essential tools every business needs, all in one place.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
            {mainFeatures.map((feature) => (
              <InteractiveCard key={feature.title} className="p-4 md:p-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="flex h-9 w-9 md:h-12 md:w-12 items-center justify-center rounded-xl md:rounded-2xl bg-bhutan-maroon/10 text-bhutan-maroon flex-shrink-0 group-hover:bg-bhutan-maroon group-hover:text-bhutan-gold transition-all duration-300">
                    <feature.icon className="h-4 w-4 md:h-6 md:w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm md:text-base font-black mb-1 tracking-tight group-hover:text-bhutan-maroon transition-colors">{feature.title}</h3>
                    <p className="text-muted-foreground mb-3 text-[10px] md:text-xs leading-relaxed font-medium">{feature.description}</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {feature.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold opacity-80">
                          <div className="h-1.5 w-1.5 rounded-full bg-bhutan-maroon flex-shrink-0" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </InteractiveCard>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="container px-4 md:px-6">
          <div className="text-center max-w-xl mx-auto mb-8 md:mb-10">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black mb-3 tracking-tight">Powerful Add-Ons</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground font-medium">
              Extra tools to manage your business end to end.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
            {additionalFeatures.map((feature) => (
              <InteractiveCard key={feature.title} className="p-3 md:p-5">
                <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl bg-bhutan-maroon/10 text-bhutan-maroon mb-3 group-hover:bg-bhutan-maroon group-hover:text-bhutan-gold transition-all duration-300">
                  <feature.icon className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <h3 className="text-xs md:text-sm font-black mb-1 tracking-tight group-hover:text-bhutan-maroon transition-colors">{feature.title}</h3>
                <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed font-medium">{feature.description}</p>
              </InteractiveCard>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Methods Marquee */}
      <section className="py-16 md:py-24 border-y bg-white overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-white via-transparent to-transparent z-10 pointer-events-none w-20 md:w-40" />
        <div className="absolute inset-y-0 right-0 bg-gradient-to-l from-white via-transparent to-transparent z-10 pointer-events-none w-20 md:w-40" />

        <div className="container px-4 md:px-6 mb-12 text-center relative z-20">
          <Badge className="bg-bhutan-maroon/10 text-bhutan-maroon border-none px-4 py-2 rounded-full font-black tracking-[0.2em] uppercase text-[10px] mb-4">Payments</Badge>
          <h2 className="text-xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">All Bhutanese Payment Methods</h2>
          <p className="text-xs md:text-base text-slate-500 font-bold mt-2">Record payments from any bank or mobile app.</p>
        </div>

        <div className="relative flex overflow-x-hidden">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-4 md:gap-8 min-w-full py-4">
            {[...paymentMethods, ...paymentMethods, ...paymentMethods].map((method, idx) => (
              <div key={`${method}-${idx}`} className="group relative">
                <div className="glow-card lighting-glow bg-slate-50 px-6 md:px-10 py-4 md:py-7 rounded-2xl md:rounded-[2rem] border border-slate-100 flex items-center gap-3 md:gap-5 transition-all duration-300 shadow-sm">
                  <div className="h-2.5 w-2.5 rounded-full bg-bhutan-gold animate-pulse shadow-[0_0_10px_rgba(255,215,0,0.8)]" />
                  <span className="text-sm md:text-2xl font-black text-slate-800 tracking-tighter uppercase group-hover:text-bhutan-maroon transition-colors">
                    {method}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
