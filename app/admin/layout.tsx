'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname, redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import SessionProvider from '@/components/providers/SessionProvider'
import { cn } from '@/lib/utils'

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const isLoginPage = pathname === '/admin/login'

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl border-4 border-bhutan-maroon/20 border-t-bhutan-maroon animate-spin shadow-lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-inner overflow-hidden">
              <Image
                src="/images/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="object-cover rounded-full p-0.5"
              />
            </div>
          </div>
        </div>
        <p className="text-sm font-black text-bhutan-maroon uppercase tracking-widest animate-pulse">Initializing Admin Desk...</p>
      </div>
    )
  }

  if (!session && !isLoginPage) {
    redirect('/admin/login')
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <AdminSidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <main
        className={cn(
          'transition-all duration-500 ease-in-out',
          isSidebarCollapsed ? 'ml-20' : 'ml-64'
        )}
      >
        <div className="p-8 max-w-[1600px] mx-auto stagger-in">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </SessionProvider>
  )
}
