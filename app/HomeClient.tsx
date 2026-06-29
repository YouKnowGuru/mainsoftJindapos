'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import {
  Download,
  Check,
  LayoutDashboard,
  Key,
  Database,
  Users,
  ShoppingBag,
  TrendingUp,
  Shield,
  BarChart3,
  Settings,
  Bell,
  Clock,
  ArrowRight,
  Package,
  ShoppingCart,
  Receipt,
  Calculator,
  FileText,
  Wallet,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { InteractiveCard } from '@/components/InteractiveCard'

const features = [
  {
    icon: ShoppingCart,
    title: 'POS Sales',
    description: 'Barcode-ready checkout with cart hold, discounts, and 10 payment modes.',
  },
  {
    icon: Package,
    title: 'Inventory Management',
    description: 'Real-time stock tracking, low stock alerts, categories, units, and barcode management.',
  },
  {
    icon: Calculator,
    title: 'GST Compliance',
    description: 'Automatic 5% GST on taxable sales with monthly return generation for filing.',
  },
  {
    icon: Receipt,
    title: 'Invoicing & Printing',
    description: 'Professional invoices, 4 print templates, thermal receipt support, email invoices.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Trial Balance, Profit & Loss, Balance Sheet, Outstanding, and Stock Valuation reports.',
  },
  {
    icon: Users,
    title: 'Customers & Suppliers',
    description: 'Contact management, credit limits, payment history, ledgers, and customer statements.',
  },
  {
    icon: Wallet,
    title: 'Bhutanese Payments',
    description: 'mBOB, BNB Pay, TPay, DrukPNB, BDBL, DKBank, Cash, Card, Bank Transfer, and Credit.',
  },
  {
    icon: FileText,
    title: 'Purchase Orders & Quotes',
    description: 'Create supplier orders, receive inventory, send price quotes, convert to sales.',
  },
  {
    icon: Settings,
    title: 'Settings & Backup',
    description: 'Company info, user management, cloud backup (Drive/MEGA), audit trail, tiered pricing.',
  },
]

const pricingPlans = [
  {
    name: 'Free Trial',
    period: '7 days',
    description: 'Try everything free',
    features: [
      'All 20+ Features',
      'Unlimited Products',
      'GST Compliance',
      '1 User Account',
    ],
    cta: 'Start Trial',
    href: '/download',
  },
  {
    name: 'Starter (1-Yr)',
    period: '1st year',
    description: 'Billed annually',
    features: [
      '1 User Account',
      'All POS Features',
      'Full Accounting',
      'Priority Support',
    ],
    cta: 'Get Started',
    href: '/contact',
    popular: true,
  },
]

const paymentMethods = [
  'mBOB', 'BNB', 'TPay', 'DrukPNB', 'BDBL', 'DKBank', 'Cash', 'Card'
]

const TypingText = ({ text }: { text: string }) => {
  const [displayText, setDisplayText] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [speed, setSpeed] = React.useState(70);

  React.useEffect(() => {
    const handleTyping = () => {
      if (!isDeleting && index < text.length) {
        setDisplayText(prev => prev + text[index]);
        setIndex(prev => prev + 1);
        setSpeed(70);
      } else if (isDeleting && index > 0) {
        setDisplayText(prev => prev.slice(0, -1));
        setIndex(prev => prev - 1);
        setSpeed(40);
      } else if (!isDeleting && index === text.length) {
        setTimeout(() => setIsDeleting(true), 2500);
      } else if (isDeleting && index === 0) {
        setIsDeleting(false);
        setSpeed(500);
      }
    };

    const timeout = setTimeout(handleTyping, speed);
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, index, speed, text]);

  return (
    <span className="relative">
      {displayText}
      <span className="inline-block w-[3px] h-[1em] bg-bhutan-gold ml-1 animate-pulse align-middle" />
    </span>
  );
};

const ModuleCard = ({ module, index }: { module: any, index: number }) => {
  return (
    <InteractiveCard className="p-4 md:p-6 rounded-2xl md:rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
      <div className={cn("absolute top-0 right-0 w-24 h-24 opacity-[0.03] group-hover:opacity-15 transition-opacity bg-gradient-to-br -mr-12 -mt-12 blur-2xl rounded-full", module.color)} />

      <div className={cn(
        "h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg mb-4 md:mb-6 transition-all duration-500 transform-style-3d",
        "group-hover:scale-110 group-hover:translate-z-10 group-hover:shadow-bhutan-gold/20",
        "bg-gradient-to-br", module.color
      )}>
        <module.icon className="h-5 w-5 md:h-7 md:w-7" />
      </div>

      <div className="relative z-10">
        <h3 className="text-sm md:text-lg font-black text-slate-900 mb-1 md:mb-2 tracking-tight group-hover:text-bhutan-maroon transition-colors">
          {module.title}
        </h3>
        <p className="text-slate-500 text-[10px] md:text-sm leading-relaxed font-medium">
          {module.desc}
        </p>
      </div>
    </InteractiveCard>
  );
};

export default function HomeClient() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-bhutan-maroon-dark via-bhutan-maroon to-slate-900 text-white flex items-center py-12 md:py-20">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
        <div className="container relative z-10 px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="flex flex-col gap-4 md:gap-8 stagger-in text-center lg:text-left items-center lg:items-start">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md w-fit mx-auto lg:mx-0">
                <div className="h-1.5 w-1.5 rounded-full bg-bhutan-gold animate-pulse" />
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-bhutan-gold">Premium Accounting & POS Solution</span>
              </div>
              <div className="space-y-3 md:space-y-5">
                <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-glow-maroon">
                  <TypingText text="Modern POS for" />
                  <br />
                  <span className="text-bhutan-gold">Bhutanese Businesses</span>
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-white/80 max-w-lg leading-relaxed font-medium">
                  Streamline sales, manage inventory, handle GST compliance, and grow your business with Jinda — built specifically for Bhutan.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 w-full sm:w-auto">
                <Link href="/download" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full h-11 md:h-14 px-6 md:px-8 bg-bhutan-gold text-bhutan-maroon-dark hover:bg-bhutan-gold-light font-black shadow-xl shadow-bhutan-gold/20 btn-glow rounded-xl text-sm md:text-base">
                    <Download className="mr-2 h-4 w-4" />
                    Download Free Trial
                  </Button>
                </Link>
                <Link href="/features" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full h-11 md:h-14 px-6 md:px-8 border-white/20 text-white hover:bg-white/10 glass-premium rounded-xl text-sm md:text-base font-bold">
                    Explore Features
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap justify-center lg:justify-start items-center gap-3 md:gap-5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/40">
                <div className="flex items-center gap-1.5"><Check className="h-3 w-3 text-bhutan-gold" /> Free 7-day trial</div>
                <div className="flex items-center gap-1.5"><Check className="h-3 w-3 text-bhutan-gold" /> Works offline</div>
                <div className="flex items-center gap-1.5"><Check className="h-3 w-3 text-bhutan-gold" /> GST compliant</div>
              </div>
            </div>

            <div className="relative group/mock hidden md:block scale-75 md:scale-90 lg:scale-100 lg:translate-x-8 origin-center">
              {/* Main Mock Container */}
              <div className="relative rounded-[2rem] bg-slate-950/20 backdrop-blur-xl p-4 border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden glass-dark-premium">
                {/* Internal Recursive Glass Effect */}
                <div className="aspect-[16/10] rounded-2xl bg-[#0f172a]/90 flex overflow-hidden relative">
                  {/* Subtle Scanline Effect */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%]" />

                  {/* Mock Sidebar */}
                  <div className="w-[180px] bg-gradient-to-b from-bhutan-maroon to-bhutan-maroon-dark p-4 flex flex-col gap-1 z-10 border-r border-white/5 shadow-2xl">
                    <div className="flex items-center gap-2 mb-6 px-1">
                      <div className="relative h-8 w-8 flex items-center justify-center rounded-full bg-white shadow-lg overflow-hidden">
                        <NextImage
                          src="/images/logo.png"
                          alt="Jinda POS Logo"
                          width={32}
                          height={32}
                          className="object-cover rounded-full p-0.5"
                        />
                      </div>
                      <span className="text-[11px] font-black text-white/90 uppercase tracking-tighter">Command Center</span>
                    </div>
                    {[
                      { icon: LayoutDashboard, label: 'Dashboard', active: true },
                      { icon: Key, label: 'POS Sales' },
                      { icon: Database, label: 'Inventory' },
                      { icon: Users, label: 'Customers' },
                      { icon: ShoppingBag, label: 'Suppliers' },
                      { icon: TrendingUp, label: 'Journal' },
                      { icon: Shield, label: 'GST Engine' },
                      { icon: BarChart3, label: 'Analytics' },
                      { icon: Settings, label: 'Settings' }
                    ].map((item, i) => (
                      <div
                        key={item.label}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-default group/item",
                          item.active
                            ? "bg-bhutan-gold text-bhutan-maroon font-black shadow-xl shadow-bhutan-gold/20 scale-[1.02]"
                            : "text-white/40 hover:bg-white/5 hover:text-white"
                        )}
                        style={{ animationDelay: `${i * 0.05}s` }}
                      >
                        <item.icon className={cn("h-3.5 w-3.5", item.active ? "text-bhutan-maroon" : "group-hover:text-bhutan-gold transition-colors")} />
                        <span className="text-[10px] uppercase font-bold tracking-tight">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Mock Main Content */}
                  <div className="flex-1 flex flex-col bg-[#020617] relative">
                    {/* Mock Top Bar */}
                    <div className="h-12 border-b border-white/5 flex items-center justify-between px-6 bg-white/[0.02]">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">System Online</span>
                        </div>
                        <span className="text-[10px] font-bold text-white/30 tracking-tight">Reg: TH-POS-2026-001</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                          <Bell className="h-3.5 w-3.5 text-white/40" />
                        </div>
                        <div className="h-8 px-3 rounded-lg bg-bhutan-maroon/20 border border-bhutan-maroon/30 flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full bg-bhutan-gold flex items-center justify-center font-black text-[8px] text-bhutan-maroon">K</div>
                          <span className="text-[9px] font-black text-white/80">Admin</span>
                        </div>
                      </div>
                    </div>

                    {/* Dashboard Content */}
                    <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-hidden">
                      <div className="grid grid-cols-1 gap-4 stagger-in">
                        {/* 1 Wide Card */}
                        <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/5 relative overflow-hidden group/card shadow-inner">
                          <p className="text-[7px] md:text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Today&apos;s Sales</p>
                          <h4 className="text-lg md:text-xl font-black text-white tracking-tighter text-glow-gold">Nu. 45,230</h4>
                        </div>
                        {/* 2 Split Cards */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/5">
                            <p className="text-[7px] md:text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Profit</p>
                            <h4 className="text-base md:text-lg font-black text-bhutan-gold tracking-tighter">Nu. 12,450</h4>
                          </div>
                          <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/5">
                            <p className="text-[7px] md:text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Items Sold</p>
                            <h4 className="text-base md:text-lg font-black text-white tracking-tighter">127</h4>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 stagger-in">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-[10px] font-black text-white/80 uppercase tracking-widest">Live Feed</h5>
                        </div>
                        <div className="space-y-2">
                          {[
                            { name: 'P. Wangmo', amount: '12,450' },
                            { name: 'T. Namgay', amount: '5,200' }
                          ].map((tx, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] border border-white/5">
                              <div className="flex items-center gap-3">
                                <div className="h-6 w-6 rounded bg-bhutan-maroon/20 flex items-center justify-center font-black text-[8px] text-bhutan-gold">{tx.name[0]}</div>
                                <span className="text-[10px] font-black text-white/70">{tx.name}</span>
                              </div>
                              <span className="text-[10px] font-black text-bhutan-gold">Nu. {tx.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Floating Stats Overlay */}
              <div className="absolute -bottom-12 md:-bottom-8 left-1/2 -translate-x-1/2 lg:-left-12 lg:translate-x-0 rounded-[2rem] bg-white/95 backdrop-blur-3xl p-3 md:p-6 shadow-2xl border border-white flex flex-col gap-4 animate-float hover-lift scale-[0.6] sm:scale-[0.7] md:scale-100 z-20">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-green-50 shadow-inner">
                    <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-0.5">Live Sales</p>
                    <p className="text-xl md:text-2xl font-black text-bhutan-maroon tracking-tighter whitespace-nowrap">Nu. 45,230</p>
                  </div>
                </div>
              </div>

              <div className="absolute -top-14 md:-top-10 right-1/2 translate-x-1/2 lg:-right-12 lg:translate-x-0 rounded-[2rem] bg-bhutan-maroon p-3 md:p-6 shadow-2xl border border-bhutan-maroon-dark animate-float hover-lift scale-[0.6] sm:scale-[0.7] md:scale-100 z-20" style={{ animationDelay: '-1s' }}>
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                    <Shield className="h-5 w-5 md:h-6 md:w-6 text-bhutan-gold spin-slow" />
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] text-bhutan-gold/60 font-black uppercase tracking-[0.2em] mb-0.5">GST Rate</p>
                    <p className="text-xl md:text-2xl font-black text-white tracking-tighter whitespace-nowrap">5% GST</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-12 md:py-20 relative bg-white overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-gradient-to-b from-bhutan-maroon/5 to-transparent pointer-events-none" />
        <div className="container px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center text-center mb-10 md:mb-16 space-y-3">
            <Badge className="bg-bhutan-maroon/10 text-bhutan-maroon border-none px-3 py-1 rounded-full font-black tracking-widest uppercase text-[9px]">Registry Hub</Badge>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">The Bhutanese Business Suite</h2>
            <p className="text-xs md:text-sm text-slate-500 max-w-xl font-bold">9 Integrated modules engineered for the local market</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 stagger-in">
            {[
              { icon: LayoutDashboard, title: 'Dashboard', desc: 'Real-time sales, stock alerts, and business overview.', color: 'from-blue-500 to-indigo-600' },
              { icon: ShoppingCart, title: 'POS Terminal', desc: 'Barcode scanning, cart hold, 10 payment modes.', color: 'from-green-500 to-emerald-600' },
              { icon: Package, title: 'Inventory', desc: 'Stock tracking, low alerts, barcode management.', color: 'from-orange-500 to-amber-600' },
              { icon: Users, title: 'Customers', desc: 'Contacts, credit limits, ledgers, statements.', color: 'from-purple-500 to-violet-600' },
              { icon: TrendingUp, title: 'Accounting', desc: 'Double-entry, payments, transfers, expenses.', color: 'from-bhutan-maroon to-red-700' },
              { icon: Shield, title: 'GST Core', desc: 'Auto 5% GST, monthly returns, filing status.', color: 'from-yellow-400 to-bhutan-gold' },
              { icon: BarChart3, title: 'Reports', desc: 'P&L, Balance Sheet, Trial Balance, Stock.', color: 'from-cyan-500 to-blue-600' },
              { icon: Receipt, title: 'PO & Quotes', desc: 'Purchase orders, quotations, convert to sale.', color: 'from-teal-500 to-emerald-600' },
              { icon: Settings, title: 'Settings', desc: 'Backup, users, audit trail, cloud sync.', color: 'from-pink-500 to-rose-600' }
            ].map((module, i) => (
              <ModuleCard key={i} module={module} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Payment Methods Marquee */}
      <section className="py-12 border-y bg-slate-50/30 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-white z-10 pointer-events-none w-20 md:w-40" />
        <div className="absolute inset-y-0 right-0 bg-gradient-to-l from-white via-transparent to-white z-10 pointer-events-none w-20 md:w-40" />

        <div className="container px-4 md:px-6 mb-8 text-center relative z-20">
          <Badge className="bg-bhutan-gold/10 text-bhutan-maroon border-none px-3 py-1 rounded-full font-black tracking-widest uppercase text-[8px] mb-2">Transaction Ready</Badge>
          <h2 className="text-sm md:text-xl font-black text-slate-900 tracking-tight uppercase">Trusted Payment Partners</h2>
        </div>

        <div className="relative flex overflow-x-hidden">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-4 md:gap-8 min-w-full py-4">
            {[...paymentMethods, ...paymentMethods, ...paymentMethods].map((method, idx) => (
              <div
                key={`${method}-${idx}`}
                className="group relative"
              >
                <div className="glow-card lighting-glow bg-white px-6 md:px-10 py-3 md:py-5 rounded-2xl border border-slate-100 flex items-center gap-3 md:gap-4 transition-all duration-300">
                  <div className="h-2 w-2 rounded-full bg-bhutan-gold animate-pulse shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
                  <span className="text-xs md:text-lg font-black text-slate-800 tracking-tighter uppercase group-hover:text-bhutan-maroon transition-colors">
                    {method}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-32 relative overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-bhutan-maroon/[0.03] blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-bhutan-gold/[0.03] blur-[120px] rounded-full pointer-events-none" />

        <div className="container relative z-10 px-4 md:px-6">
          <div className="flex flex-col items-center text-center mb-16 md:mb-20">
            <Badge className="bg-bhutan-maroon/10 text-bhutan-maroon border-none px-4 py-2 rounded-full font-black tracking-[0.3em] uppercase text-[10px] mb-6 shadow-sm">Visionary Core</Badge>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">Architects of Digital Change</h2>
          </div>

          <div className="max-w-3xl mx-auto w-full">
            {/* Founder Card */}
            <div className="group relative overflow-hidden rounded-[3rem] bg-slate-900 shadow-2xl transition-all duration-700 hover:shadow-bhutan-maroon/20 h-[500px] md:h-[650px]">
              <NextImage
                src="/images/kb.png"
                alt="Keshab Baral - Founder and Lead Systems Developer of Jinda POS"
                fill
                className="object-cover object-top group-hover:scale-110 transition-transform duration-1000 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />

              <div className="absolute top-8 left-8">
                <div className="bg-bhutan-gold text-bhutan-maroon font-black text-[10px] uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-lg">Founder & Architect</div>
              </div>

              <div className="absolute bottom-8 left-8 right-8">
                <div className="glass-premium p-8 rounded-[2.5rem] border border-white/30 backdrop-blur-xl relative overflow-hidden group/quote shadow-2xl">
                  <div className="absolute -top-6 -left-2 text-[120px] text-bhutan-maroon/5 font-serif italic pointer-events-none select-none">&ldquo;</div>
                  <p className="text-sm md:text-lg text-slate-900 font-bold leading-relaxed relative z-10 italic">
                    &quot;Empowering Bhutanese entrepreneurs with world-class technology tailored specifically for our unique local economy.&quot;
                  </p>
                  <div className="mt-6 md:mt-8 flex items-center justify-between">
                    <div>
                      <h4 className="text-lg md:text-xl font-black text-bhutan-maroon tracking-tight">Keshab Baral</h4>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Lead Systems Developer</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-bhutan-maroon flex items-center justify-center text-bhutan-gold text-lg font-black rotate-3 group-hover/quote:rotate-0 transition-transform shadow-lg">KB</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20 bg-slate-50 relative overflow-hidden">
        <div className="container px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-16 space-y-3">
            <Badge className="bg-bhutan-maroon/10 text-bhutan-maroon border-none px-3 py-1 rounded-full font-black tracking-widest uppercase text-[9px]">Pricing</Badge>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Precision Scaling Plans</h2>
            <p className="text-xs md:text-sm text-slate-500 font-bold">Zero hidden costs. Full compliance guaranteed.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "relative flex flex-col rounded-2xl md:rounded-[2rem] transition-all duration-300 overflow-hidden border-none",
                  plan.popular ? "bg-bhutan-maroon text-white shadow-xl md:scale-105" :
                    plan.bestValue ? "bg-slate-900 text-white shadow-xl md:scale-105 border-2 border-bhutan-gold/30" :
                      "bg-white text-slate-900 shadow-sm hover:shadow-lg"
                )}
              >
                {plan.popular && (
                  <div className="absolute top-4 right-4 md:top-6 md:right-6">
                    <div className="bg-bhutan-gold text-bhutan-maroon text-[8px] md:text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                      Popular
                    </div>
                  </div>
                )}
                {plan.bestValue && (
                  <div className="absolute top-4 right-4 md:top-6 md:right-6">
                    <div className="bg-bhutan-gold text-bhutan-maroon text-[8px] md:text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                      Best Value
                    </div>
                  </div>
                )}
                <CardContent className="p-4 md:p-6 flex flex-col flex-1 h-full">
                  <div className="mb-4 md:mb-6">
                    <h3 className="text-base md:text-lg font-black mb-1">{plan.name}</h3>
                    {!plan.description.includes('Renew') && (
                      <p className={cn("text-[10px] md:text-xs font-bold opacity-60")}>{plan.description}</p>
                    )}
                  </div>
                  <div className="mb-6 md:mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className={cn("text-base md:text-lg font-black opacity-60 uppercase tracking-widest", plan.bestValue ? "text-white" : "text-slate-500")}>{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-[11px] md:text-xs font-bold opacity-80">
                        <Check className={cn("h-3.5 w-3.5 flex-shrink-0 mt-0.5", plan.popular ? "text-bhutan-gold" : "text-bhutan-maroon")} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.href}>
                    <Button
                      className={cn(
                        "w-full h-10 md:h-12 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all",
                        plan.popular
                          ? "bg-bhutan-gold text-bhutan-maroon hover:bg-white hover:text-bhutan-maroon shadow-md" :
                          plan.bestValue
                            ? "bg-bhutan-gold text-bhutan-maroon hover:bg-white hover:text-bhutan-maroon shadow-bhutan-gold/20"
                            : "bg-slate-900 text-white hover:bg-bhutan-maroon"
                      )}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
        <div className="container text-center relative z-10 px-4 md:px-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black mb-4 md:mb-6 tracking-tight">
            Ascend Your <span className="text-bhutan-gold">Business</span>
          </h2>
          <p className="text-xs md:text-sm text-white/60 max-w-lg mx-auto mb-6 md:mb-10 font-medium leading-relaxed">
            Join the digital revolution in Bhutan. Deploy Jinda today.
          </p>
          <Link href="/download">
            <Button size="lg" className="h-11 md:h-14 px-8 md:px-10 bg-bhutan-gold text-bhutan-maroon-dark hover:bg-white font-black shadow-xl shadow-bhutan-gold/20 btn-glow rounded-xl text-sm md:text-base">
              <Download className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Download Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
