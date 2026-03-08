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
    Receipt
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const values = [
    {
        icon: Globe,
        title: 'Bhutanese First',
        description: 'Engineered specifically for the unique economic landscape of the Kingdom, from GST compliance to local payment integrations.'
    },
    {
        icon: Shield,
        title: 'Offline-First Sovereignty',
        description: 'Data stays with you. Our POS operates perfectly without internet, ensuring business continuity in any terrain.'
    },
    {
        icon: Award,
        title: 'Precision Engineering',
        description: 'A strict double-entry accounting engine underpins every transaction, ensuring financial integrity without the complexity.'
    }
]

const features = [
    { icon: Calculator, title: 'GST Engine', desc: 'Automatic 5% Bhutan GST calculation on every sale, purchase, and return.' },
    { icon: ShoppingCart, title: 'POS Terminal', desc: 'Barcode-ready sales interface with credit control and multiple payment modes.' },
    { icon: Database, title: 'Inventory Hub', desc: 'Real-time stock tracking with average cost method and low stock alerts.' },
    { icon: Receipt, title: 'Compliance Reporting', desc: 'Generate Trial Balances, P&L, and Balance Sheets with absolute precision.' }
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
                        <Badge className="bg-bhutan-maroon text-bhutan-gold border-none px-4 py-1.5 rounded-full font-black tracking-widest uppercase text-[10px]">About Dhisum Tseyig</Badge>
                        <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-none text-glow-maroon">
                            Architects of <span className="text-bhutan-gold">Digital</span> Change
                        </h1>
                        <p className="text-lg md:text-xl text-white/70 font-medium leading-relaxed max-w-2xl">
                            We are building the technological backbone for the next generation of Bhutanese entrepreneurs. Our mission is to democratize world-class business tools for every dzongkhag in the Kingdom.
                        </p>
                    </div>
                </div>
            </section>

            {/* Mission & Vision */}
            <section className="py-20 bg-white">
                <div className="container px-4 md:px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Software Powered by Vision</h2>
                                <div className="h-1.5 w-20 bg-bhutan-maroon rounded-full" />
                            </div>
                            <p className="text-slate-600 font-medium leading-relaxed">
                                Dhisum Tseyig was born from a simple observation: Bhutanese businesses were being forced to choose between overly complex international software or inefficient manual ledgers.
                            </p>
                            <p className="text-slate-600 font-medium leading-relaxed">
                                We bridge that gap. By combining modern UI/UX with a powerhouse double-entry accounting engine, we allow business owners to focus on growth while we handle the complexity of compliance and inventory.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-6 pt-4">
                                {features.map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-bhutan-maroon/5 flex items-center justify-center text-bhutan-maroon">
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-sm">{item.title}</h4>
                                            <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
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
                        <Badge className="bg-bhutan-maroon/10 text-bhutan-maroon border-none px-4 py-2 rounded-full font-black tracking-[0.3em] uppercase text-[10px] mb-6 shadow-sm">Visionary Core</Badge>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">The Minds Behind the Code</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-stretch max-w-6xl mx-auto">
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
                                <div className="bg-bhutan-gold text-bhutan-maroon font-black text-[10px] uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-lg">Founder & Architect</div>
                            </div>

                            <div className="absolute bottom-8 left-8 right-8">
                                <div className="glass-premium p-8 rounded-[2.5rem] border border-white/30 backdrop-blur-xl relative overflow-hidden group/quote shadow-2xl">
                                    <div className="absolute -top-6 -left-2 text-[120px] text-white/5 font-serif italic pointer-events-none select-none">&ldquo;</div>
                                    <div className="space-y-4 relative z-10">
                                        <p className="text-sm md:text-base text-slate-900 font-bold leading-relaxed italic">
                                            &quot;True technological progress isn&apos;t just about powerful code—it&apos;s about creating tools that respect local context. Keshab Baral founded Dhisum Tseyig on the principle of &apos;Technological Sovereignty&apos; for Bhutan.&quot;
                                        </p>
                                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                            As the Lead Systems Developer, Keshab ensures every feature—from the GST engine to the offline synchronization—is engineered with the precision required for high-stakes business management while remaining accessible to every entrepreneur in the Heart of the Himalayas.
                                        </p>
                                    </div>
                                    <div className="mt-8 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-xl font-black text-bhutan-maroon tracking-tight">Keshab Baral</h4>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Founding Developer | Tsirang, Bhutan</p>
                                        </div>
                                        <div className="h-12 w-12 rounded-2xl bg-bhutan-maroon flex items-center justify-center text-bhutan-gold text-lg font-black rotate-3 group-hover/quote:rotate-0 transition-transform shadow-lg">KB</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Partner Card */}
                        <div className="group relative overflow-hidden rounded-[3rem] bg-slate-900 shadow-2xl transition-all duration-700 hover:shadow-bhutan-maroon/20 h-[600px] md:h-[750px]">
                            <NextImage
                                src="/images/power by.jpeg"
                                alt="Strategic Partner"
                                fill
                                className="object-cover object-center group-hover:scale-110 transition-transform duration-1000 opacity-90"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-90" />

                            <div className="absolute top-8 left-8">
                                <div className="bg-bhutan-maroon text-bhutan-gold font-black text-[10px] uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-lg">Strategic Partner</div>
                            </div>

                            <div className="absolute bottom-8 left-8 right-8">
                                <div className="glass-premium p-8 rounded-[2.5rem] border border-white/30 backdrop-blur-xl relative overflow-hidden group/quote shadow-2xl">
                                    <div className="absolute -top-6 -left-2 text-[120px] text-white/5 font-serif italic pointer-events-none select-none">&ldquo;</div>
                                    <p className="text-sm md:text-lg text-slate-900 font-bold leading-relaxed relative z-10 italic">
                                        &quot;Our Store Tsirang stands as the primary catalyst for digital transformation in the region, bridging the gap between world-class POS technology and local business needs.&quot;
                                    </p>
                                    <div className="mt-8 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-xl font-black text-bhutan-maroon tracking-tight">Our Store Tsirang</h4>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Digital Transformation Partner</p>
                                        </div>
                                        <div className="h-12 w-12 rounded-2xl bg-bhutan-maroon flex items-center justify-center text-bhutan-gold text-lg font-black -rotate-3 group-hover/quote:rotate-0 transition-transform shadow-lg">OTS</div>
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
                    <p className="text-bhutan-gold font-bold mb-10 max-w-xl mx-auto">Experience the precision of Dhisum Tseyig. Start your 7-day free trial today.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/download">
                            <Button size="lg" className="bg-bhutan-gold text-bhutan-maroon hover:bg-white hover:text-bhutan-maroon font-black h-14 px-8 rounded-2xl shadow-xl transition-all">
                                Download Free Trial
                            </Button>
                        </Link>
                        <Link href="/contact">
                            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 font-bold h-14 px-8 rounded-2xl backdrop-blur-md">
                                Contact Sales
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}
