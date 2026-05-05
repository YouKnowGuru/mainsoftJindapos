'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import StatCard from '@/components/admin/StatCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Key,
  Users,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Calendar,
  Package,
  Clock
} from 'lucide-react'

interface DashboardStats {
  stats: {
    totalLicenses: number
    activeLicenses: number
    inactiveLicenses: number
    expiredLicenses: number
    totalCustomers: number
    starterLicenses: number
    proLicenses: number
    lifetimeLicenses: number
    expiringSoon: number
  }
  recentLicenses: Array<{
    _id: string
    licenseKey: string
    customerName: string
    email: string
    plan: string
    status: string
    createdAt: string
  }>
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats')
        if (!response.ok) {
          throw new Error('Failed to fetch stats')
        }
        const data = await response.json()
        setData(data)
      } catch (err) {
        setError('Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  const stats = data?.stats

  return (
    <div className="space-y-10 stagger-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm shadow-bhutan-maroon/5 relative overflow-hidden gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-bhutan-gold/5 blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-none mb-3">Admin Dashboard</h1>
          <p className="text-xs md:text-sm font-bold text-slate-400">
            Real-time control center for Jinda Ecosystem
          </p>
        </div>
        <div className="flex gap-3 relative z-10 w-full md:w-auto">
          <Link href="/admin/licenses/create" className="w-full">
            <Button className="w-full bg-bhutan-maroon hover:bg-bhutan-maroon-dark text-white font-black rounded-xl px-6 h-12 shadow-lg shadow-bhutan-maroon/20 btn-glow shine-effect">
              <Key className="mr-2 h-4 w-4" />
              Generate License
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Ecosystem Licenses"
          value={stats?.totalLicenses || 0}
          description="Lifetime generated"
          icon={<Key className="h-5 w-5" />}
        />
        <StatCard
          title="Active Daily Instances"
          value={stats?.activeLicenses || 0}
          description="Currently serving"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Kingdom Customers"
          value={stats?.totalCustomers || 0}
          description="Verified businesses"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Critical Alerts"
          value={stats?.expiringSoon || 0}
          description="Expiry threats"
          icon={<AlertCircle className="h-5 w-5" />}
          className={stats && stats.expiringSoon > 0 ? 'border-bhutan-orange bg-bhutan-orange/5' : ''}
        />
      </div>

      {/* License Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'Starter Kit', value: stats?.starterLicenses, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pro Solutions', value: stats?.proLicenses, icon: TrendingUp, color: 'text-bhutan-maroon', bg: 'bg-bhutan-maroon/5' },
          { label: 'Lifetime Access', value: stats?.lifetimeLicenses, icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((item) => (
          <Card key={item.label} className="hover-lift border-slate-100 shadow-sm overflow-hidden group rounded-3xl">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-2xl md:text-3xl font-black text-slate-900 group-hover:text-bhutan-maroon transition-colors">{item.value || 0}</p>
                </div>
                <div className={`h-12 w-12 md:h-14 md:w-14 rounded-2xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm border border-slate-100`}>
                  <item.icon className={`h-5 w-5 md:h-6 md:w-6 ${item.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Licenses */}
      <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden mb-12">
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between p-6 md:p-8 border-b border-slate-50 gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="h-10 w-10 rounded-xl bg-bhutan-maroon/5 flex items-center justify-center text-bhutan-maroon flex-shrink-0">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-lg md:text-xl font-black">Recent Issuance</CardTitle>
              <p className="text-[10px] md:text-xs font-bold text-slate-400">Latest 5 license activities</p>
            </div>
          </div>
          <Link href="/admin/licenses" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full font-bold text-bhutan-maroon hover:bg-bhutan-maroon/5 rounded-xl text-xs">
              View Audit Log
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {data?.recentLicenses && data.recentLicenses.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {data.recentLicenses.map((license) => (
                <div
                  key={license._id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 md:p-8 hover:bg-slate-50/50 transition-colors group gap-6"
                >
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-bhutan-maroon flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-500 flex-shrink-0">
                      <Key className="h-4 w-4 md:h-5 md:w-5 text-bhutan-gold" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-black text-base md:text-lg text-slate-800 tracking-tight truncate max-w-[200px] sm:max-w-none">{license.licenseKey}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs md:text-sm font-bold text-slate-500">{license.customerName}</span>
                        <span className="hidden sm:inline text-slate-200">|</span>
                        <span className="text-xs md:text-sm text-slate-400 truncate max-w-[150px]">{license.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <Badge className={cn(
                      "font-black uppercase tracking-widest text-[8px] md:text-[9px] px-3 py-1 rounded-full border-none",
                      license.status === 'active' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {license.status}
                    </Badge>
                    <Badge className="bg-bhutan-gold/10 text-bhutan-maroon font-black uppercase tracking-widest text-[8px] md:text-[9px] px-3 py-1 rounded-full border-none">
                      {license.plan}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Clock className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-400">No recent issuance activity recorded.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
