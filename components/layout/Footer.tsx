'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Download,
  Mail,
  MapPin,
  Phone,
  Facebook,
  Twitter,
  Instagram,
  Github,
  ArrowRight,
  Globe,
  ShieldCheck,
  CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const footerLinks = {
  product: [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About Us' },
    { href: '/features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/download', label: 'Download' },
    { href: '/docs', label: 'Documentation' },
  ],
  modules: [
    { href: '/features', label: 'POS Terminal' },
    { href: '/features', label: 'Inventory Hub' },
    { href: '/features', label: 'GST Core' },
    { href: '/features', label: 'Accounting' },
  ],
  support: [
    { href: '/contact', label: 'Contact Us' },
    { href: '/license-activate', label: 'Activate License' },
    { href: '/docs', label: 'User Guides' },
    { href: '/docs', label: 'Live FAQ' },
  ],
  legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
    { href: '/license', label: 'License Agreement' },
    { href: '/refund', label: 'Refund Policy' },
  ],
}

const socials = [
  { icon: Facebook, href: '#', label: 'Facebook', color: 'hover:text-blue-500' },
  { icon: Twitter, href: '#', label: 'Twitter', color: 'hover:text-sky-400' },
  { icon: Instagram, href: '#', label: 'Instagram', color: 'hover:text-pink-500' },
  { icon: Github, href: '#', label: 'Github', color: 'hover:text-white' },
]

export default function Footer() {
  return (
    <footer className="relative bg-slate-950 text-white pt-20 pb-10 overflow-hidden border-t border-white/5">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-bhutan-maroon/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-bhutan-gold/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container relative z-10 px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-20">
          {/* Brand & Newsletter Section */}
          <div className="lg:col-span-4 space-y-8">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-3 group w-fit">
                <div className="relative h-16 w-16 flex items-center justify-center rounded-full bg-white shadow-2xl ring-4 ring-white/10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 ease-out overflow-hidden">
                  <Image
                    src="/images/logo.png"
                    alt="Dhisum Tseyig Logo"
                    width={64}
                    height={64}
                    className="object-cover rounded-full p-1"
                  />
                </div>
                <span className="text-2xl font-black tracking-tighter">
                  <span className="text-white">Dhisum</span> <span className="text-bhutan-gold">Tseyig</span>
                </span>
              </Link>
              <p className="text-sm text-slate-400 max-w-sm leading-relaxed font-medium">
                The Kingdom's most advanced ERP & POS ecosystem. Engineered for the modern Bhutanese economy with offline-first, GST-ready precision.
              </p>
            </div>

            <div className="space-y-4 max-w-sm">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-bhutan-gold">Stay Updated</h4>
              <div className="relative group">
                <Input
                  placeholder="Email address"
                  className="bg-white/5 border-white/10 rounded-xl h-12 pl-4 pr-12 focus-visible:ring-bhutan-gold/30 text-xs font-bold transition-all"
                />
                <Button
                  size="icon"
                  className="absolute right-1.5 top-1.5 h-9 w-9 bg-bhutan-gold text-bhutan-maroon hover:bg-white transition-all rounded-lg"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-slate-500 font-bold px-1">Join 500+ businesses receiving our latest updates.</p>
            </div>

            <div className="flex items-center gap-4">
              {socials.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  className={cn("h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1", social.color)}
                >
                  <social.icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Links Grid */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Product</h4>
              <ul className="space-y-4">
                {footerLinks.product.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-xs font-bold text-slate-400 hover:text-bhutan-gold transition-colors inline-flex items-center group">
                      <span className="w-0 group-hover:w-2 h-px bg-bhutan-gold mr-0 group-hover:mr-2 transition-all duration-300" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Modules</h4>
              <ul className="space-y-4">
                {footerLinks.modules.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-xs font-bold text-slate-400 hover:text-bhutan-gold transition-colors inline-flex items-center group">
                      <span className="w-0 group-hover:w-2 h-px bg-bhutan-gold mr-0 group-hover:mr-2 transition-all duration-300" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Support</h4>
              <ul className="space-y-4">
                {footerLinks.support.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-xs font-bold text-slate-400 hover:text-bhutan-gold transition-colors inline-flex items-center group">
                      <span className="w-0 group-hover:w-2 h-px bg-bhutan-gold mr-0 group-hover:mr-2 transition-all duration-300" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Legal</h4>
              <ul className="space-y-4">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-xs font-bold text-slate-400 hover:text-bhutan-gold transition-colors inline-flex items-center group">
                      <span className="w-0 group-hover:w-2 h-px bg-bhutan-gold mr-0 group-hover:mr-2 transition-all duration-300" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Global Stats Overlay */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-white/5 py-10 mb-10 overflow-hidden">
          <div className="flex items-center gap-4 px-6 md:border-r border-white/5">
            <div className="h-10 w-10 rounded-full bg-bhutan-gold/10 flex items-center justify-center text-bhutan-gold">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-0.5">Deployment</p>
              <p className="text-sm font-black text-white uppercase tracking-tight">Active Kingdom Wide</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-6 md:border-r border-white/5">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-0.5">Security</p>
              <p className="text-sm font-black text-white uppercase tracking-tight">Enterprise Grade SSL</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-6">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-0.5">Payments</p>
              <p className="text-sm font-black text-white uppercase tracking-tight">mBOB, TPay & More</p>
            </div>
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-6">
          <div className="flex flex-col gap-2 items-center md:items-start text-center md:text-left">
            <p className="text-[10px] font-bold text-white/30 tracking-widest uppercase">
              &copy; {new Date().getFullYear()} Dhisum Tseyig. All Rights Reserved.
            </p>
            <p className="text-[11px] font-black text-white/60 tracking-tight">
              Engineered with Precision in the Heart of the Himalayas — <span className="text-bhutan-gold">Tsirang, Bhutan.</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/download">
              <Button variant="outline" className="h-10 px-6 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white hover:text-slate-950 font-black text-[10px] uppercase tracking-widest transition-all">
                <Download className="mr-2 h-3.5 w-3.5" />
                Version 1.0.4
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
