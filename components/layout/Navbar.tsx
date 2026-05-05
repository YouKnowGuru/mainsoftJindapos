'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Menu, X, Download, Key, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/features', label: 'Features' },
  { href: '/security', label: 'Security' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/download', label: 'Download' },
  { href: '/docs', label: 'Docs' },
  { href: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/50">
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-bhutan-maroon/10 to-transparent" />
      <div className="container flex h-20 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-14 w-14 flex items-center justify-center rounded-full bg-white shadow-xl ring-4 ring-bhutan-maroon/10 border-2 border-bhutan-maroon/20 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 ease-out overflow-hidden">
            <Image
              src="/images/logo.png"
              alt="Jinda Logo"
              width={56}
              height={56}
              className="object-cover rounded-full p-1"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter leading-none text-bhutan-maroon">
              Jinda
            </span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Bhutan</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 backdrop-blur-md">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm font-bold text-slate-500 rounded-xl transition-all hover:text-bhutan-maroon hover:bg-white hover:shadow-sm"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/license-activate">
            <Button variant="ghost" size="sm" className="font-bold text-slate-600 hover:text-bhutan-maroon hover:bg-bhutan-maroon/5 rounded-xl">
              <Key className="mr-2 h-4 w-4" />
              Activate
            </Button>
          </Link>
          <Link href="/download">
            <Button size="sm" className="bg-bhutan-maroon hover:bg-bhutan-maroon-dark text-white font-bold rounded-xl shadow-lg border-b-2 border-black/20 active:border-b-0 active:translate-y-[1px] transition-all">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </Link>
          <Link href="/admin/login">
            <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">
              <LayoutDashboard className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Mobile Menu */}
        {mounted && (
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] border-l-0 bg-white/95 backdrop-blur-2xl">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>Access Jinda platform sections</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-6">
                <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <div className="relative h-12 w-12 flex items-center justify-center rounded-full bg-white shadow-md ring-2 ring-bhutan-maroon/5 overflow-hidden">
                    <Image
                      src="/images/logo.png"
                      alt="Jinda Logo"
                      width={48}
                      height={48}
                      className="object-cover rounded-full p-0.5"
                    />
                  </div>
                  <span className="text-lg font-bold text-bhutan-maroon">
                    Jinda
                  </span>
                </Link>
                <nav className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm font-medium text-slate-600 transition-colors hover:text-bhutan-maroon"
                      onClick={() => setIsOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
                <div className="flex flex-col gap-2">
                  <Link href="/license-activate" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full border-bhutan-maroon/20 text-bhutan-maroon">
                      <Key className="mr-2 h-4 w-4" />
                      Activate License
                    </Button>
                  </Link>
                  <Link href="/download" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-bhutan-maroon hover:bg-bhutan-maroon-dark text-white">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </header>
  )
}
