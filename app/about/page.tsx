'use client'

import React from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import {
    Check,
    ArrowRight,
    Shield,
    TrendingUp,
    Cpu,
    Globe,
    Award,
    Users,
    Database,
    Calculator,
    ShoppingCart,
    Receipt,
    Package,
    BarChart3,
    FileText,
    Wallet,
    Printer,
    Clock,
    QrCode,
    RefreshCw,
    Briefcase,
    Tag,
    Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const values = [
    {
        icon: Globe,
        title: 'Built for Bhutan',
        description: 'Made for Bhutanese businesses — 5% GST, local payment methods (mBOB, BNB, TPay), and Bhutanese addresses (Dzongkhag/Gewog).'
    },
    {
        icon: Shield,
        title: 'Works Without Internet',
        description: 'All your data is stored on your computer. No internet needed for sales, inventory, or printing. Your data stays yours.'
    },
    {
        icon: Award,
        title: 'Accurate Accounting',
        description: 'Every transaction is recorded with proper debit/credit entries. Your books are always balanced.'
    }
]

const features = [
    { icon: ShoppingCart, title: 'POS Sales', desc: 'Barcode-ready checkout with cart hold, discounts, and 10 payment modes.' },
    { icon: Package, title: 'Inventory', desc: 'Real-time stock tracking, low stock alerts, and barcode management.' },
    { icon: Calculator, title: 'GST Compliance', desc: 'Auto 5% GST on taxable sales with monthly return generation.' },
    { icon: Receipt, title: 'Invoicing', desc: 'Professional invoices with your branding. Print or email.' },
    { icon: BarChart3, title: 'Reports', desc: 'Profit & Loss, Balance Sheet, Trial Balance, Stock Valuation.' },
    { icon: Users, title: 'Customers & Suppliers', desc: 'Track contacts, credit limits, payment history, and outstanding balances.' },
    { icon: Wallet, title: 'Bhutanese Payments', desc: 'mBOB, BNB Pay, TPay, DrukPNB, BDBL, DKBank, Cash, Card, Transfer, Credit.' },
    { icon: QrCode, title: 'Barcode Scanning', desc: 'Scan any barcode to add items to sale instantly.' },
    { icon: Briefcase, title: 'Employee & Payroll', desc: 'Manage staff records and process monthly payroll.' },
    { icon: Tag, title: 'Tiered Pricing', desc: 'Different prices for wholesale, retail, and dealer customers.' },
    { icon: RefreshCw, title: 'Recurring Transactions', desc: 'Auto-record regular income and expenses on schedule.' },
    { icon: Shield, title: 'Audit Trail', desc: 'Track every action — who did what and when.' },
]

export default function AboutPage() {
    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="relative py-20 md:py-32 overflow-hidden bg-slate-950 text-white">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-bhutan-maroon/20 blur-[120px] rounded-full" />

                <div className="container relative z-10 px-4 md:px-6">
                    <div className="max-w-3xl space-y-6 stagger-in">
                        <Badge className="bg-bhutan-maroon text-bhutan-gold border-none px-4 py-1.5 rounded-full font-black tracking-widest uppercase text-[10px]">About Jinda</Badge>
                        <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-none text-glow-maroon">
                            Business Software for <span className="text-bhutan-gold">Bhutan</span>
                        </h1>
                        <p className="text-lg md:text-xl text-white/70 font-medium leading-relaxed max-w-2xl">
                            We built Jinda because Bhutanese businesses deserved better. World-class POS, inventory, and accounting tools that understand local needs — from GST compliance to mBOB payments.
                        </p>
                    </div>
                </div>
            </section>

            {/* What's Included */}
            <section className="py-20 bg-white">
                <div className="container px-4 md:px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">20+ Features in One Package</h2>
                                <div className="h-1.5 w-20 bg-bhutan-maroon rounded-full" />
                            </div>
                            <p className="text-slate-600 font-medium leading-relaxed">
                                Jinda is not just a POS. It's a complete business management system built specifically for Bhutan. Everything from quick sales to full accounting, GST filing, payroll, and audit trails — all in one desktop application.
                            </p>
                            <p className="text-slate-600 font-medium leading-relaxed">
                                No internet needed. No monthly fees. Your data stays on your computer.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-4 pt-4">
                                {features.map((item, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-bhutan-maroon/5 flex items-center justify-center text-bhutan-maroon">
                                            <item.icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-xs">{item.title}</h4>
                                            <p className="text-[10px] text-slate-500 font-medium">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-bhutan-maroon/5 rounded-[3rem] -rotate-3" />
                            <div className="relative p-8 md:p-12 rounded-[3rem] bg-white border border-slate-100 shadow-2xl space-y-8">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Our Core Values</h3>
                                <div className="space-y-8">
                                    {values.map((v, i) => (
                                        <div key={i} className="flex gap-6 group">
                                            <div className="h-14 w-14 flex-shrink-0 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-bhutan-maroon group-hover:text-bhutan-gold transition-all duration-500 shadow-inner">
                                                <v.icon className="h-7 w-7" />
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-lg font-black text-slate-900 group-hover:text-bhutan-maroon transition-colors">{v.title}</h4>
                                                <p className="text-sm text-slate-500 font-medium leading-relaxed">{v.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Visionary Core (Founder & Partner) */}
            <section className="py-20 md:py-32 bg-slate-50 relative overflow-hidden">
                <div className="container px-4 md:px-6 relative z-10">
                    <div className="flex flex-col items-center text-center mb-16 md:mb-20">
                        <Badge className="bg-bhutan-maroon/10 text-bhutan-maroon border-none px-4 py-2 rounded-full font-black tracking-[0.3em] uppercase text-[10px] mb-6 shadow-sm">The Team</Badge>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">The People Behind the Software</h2>
                    </div>

                    <div className="max-w-3xl mx-auto w-full">
                        {/* Founder Card */}
                        <div className="group relative overflow-hidden rounded-[3rem] bg-slate-900 shadow-2xl transition-all duration-700 hover:shadow-bhutan-maroon/20 h-[600px] md:h-[750px]">
                            <NextImage
                                src="/images/kb.png"
                                alt="Keshab Baral"
                                fill
                                className="object-cover object-top group-hover:scale-110 transition-transform duration-1000 opacity-90"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-90" />

                            <div className="absolute top-8 left-8">
                                <div className="bg-bhutan-gold text-bhutan-maroon font-black text-[10px] uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-lg">Founder & Developer</div>
                            </div>

                            <div className="absolute bottom-8 left-8 right-8">
                                <div className="glass-premium p-8 rounded-[2.5rem] border border-white/30 backdrop-blur-xl relative overflow-hidden group/quote shadow-2xl">
                                    <div className="absolute -top-6 -left-2 text-[120px] text-white/5 font-serif italic pointer-events-none select-none">&ldquo;</div>
                                    <div className="space-y-4 relative z-10">
                                        <p className="text-sm md:text-base text-slate-900 font-bold leading-relaxed italic">
                                            &quot;I built Jinda because Bhutanese businesses deserve software that understands them — not forced to adapt foreign tools that don't fit our way of doing business.&quot;
                                        </p>
                                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                            Keshab Baral is the lead developer behind Jinda. Based in Tsirang, Bhutan, he designs and builds every feature with local businesses in mind — from GST compliance to mBOB payment tracking.
                                        </p>
                                    </div>
                                    <div className="mt-8 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-xl font-black text-bhutan-maroon tracking-tight">Keshab Baral</h4>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Founder & Lead Developer | Tsirang, Bhutan</p>
                                        </div>
                                        <div className="h-12 w-12 rounded-2xl bg-bhutan-maroon flex items-center justify-center text-bhutan-gold text-lg font-black rotate-3 group-hover/quote:rotate-0 transition-transform shadow-lg">KB</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-bhutan-maroon text-white relative overflow-hidden">
                <div className="container text-center relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">Ready to Modernize Your Business?</h2>
                    <p className="text-bhutan-gold font-bold mb-10 max-w-xl mx-auto">Try Jinda free for 7 days. No credit card needed.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/download">
                            <Button size="lg" className="bg-bhutan-gold text-bhutan-maroon-dark hover:bg-white hover:text-bhutan-maroon font-black h-14 px-8 rounded-2xl shadow-xl transition-all">
                                Download Free Trial
                            </Button>
                        </Link>
                        <Link href="/contact">
                            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 font-bold h-14 px-8 rounded-2xl backdrop-blur-md">
                                Contact Us
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}
