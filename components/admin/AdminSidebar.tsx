'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Key, Users, Settings, LogOut, ChevronLeft, ChevronRight, RefreshCw, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'

interface AdminSidebarProps {
  isCollapsed: boolean
  setIsCollapsed: (value: boolean) => void
}

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/licenses', label: 'Licenses', icon: Key },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/updates', label: 'Updates', icon: RefreshCw },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]


export default function AdminSidebar({ isCollapsed, setIsCollapsed }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r transition-all duration-500 ease-in-out shadow-2xl shadow-bhutan-maroon/5',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-4">
          {!isCollapsed && (
            <Link href="/admin/dashboard" className="flex items-center gap-3 group">
              <div className="relative h-12 w-12 flex items-center justify-center rounded-full bg-white shadow-lg ring-2 ring-bhutan-maroon/5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 ease-out overflow-hidden">
                <Image
                  src="/images/logo.png"
                  alt="Dhisum Tseyig Logo"
                  width={48}
                  height={48}
                  className="object-cover rounded-full p-0.5"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight text-slate-800">Dhisum Tseyig</span>
                <span className="text-[10px] font-black text-bhutan-maroon uppercase tracking-widest">Admin Desk</span>
              </div>
            </Link>
          )}
          {isCollapsed && (
            <div className="relative h-12 w-12 flex items-center justify-center rounded-full bg-white mx-auto shadow-lg ring-2 ring-bhutan-maroon/5 hover:scale-110 hover:rotate-12 transition-all duration-500 ease-out overflow-hidden">
              <Image
                src="/images/logo.png"
                alt="Dhisum Tseyig Logo"
                width={48}
                height={48}
                className="object-cover rounded-full p-0.5"
              />
            </div>
          )}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-bhutan-maroon hover:bg-bhutan-maroon/5"
              onClick={() => setIsCollapsed(true)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 hover-lift group',
                  isActive
                    ? 'bg-bhutan-maroon text-bhutan-gold shadow-lg shadow-bhutan-maroon/20'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-bhutan-maroon',
                  isCollapsed && 'justify-center px-0'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn(
                  'h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110',
                  isActive && 'text-bhutan-gold'
                )} />
                {!isCollapsed && <span>{item.label}</span>}
                {isActive && !isCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-bhutan-gold animate-pulse" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-slate-100 p-4 space-y-2">
          {isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="w-full justify-center h-12 rounded-xl text-slate-400 hover:text-bhutan-maroon hover:bg-bhutan-maroon/5"
              onClick={() => setIsCollapsed(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-4 h-12 rounded-xl text-slate-500 font-bold hover:bg-red-50 hover:text-red-600 transition-all duration-300',
              isCollapsed && 'justify-center px-0'
            )}
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </Button>

          {!isCollapsed && (
            <div className="mt-4 pt-4 border-t border-slate-50 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-tight">
                Powered by<br />Our Store Tsirang
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
