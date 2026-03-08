'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Key,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Power,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Clock
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'


interface License {
  _id: string
  licenseKey: string
  customerName: string
  email: string
  companyName: string
  plan: string
  status: string
  deviceId: string | null
  expiryDate: string | null
  activationDate: string | null
  activationCount: number
  maxUsers: number
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function LicensesPage() {
  const router = useRouter()
  const [licenses, setLicenses] = useState<License[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false)
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null)
  const [extendDays, setExtendDays] = useState('30')
  const [isExtending, setIsExtending] = useState(false)


  const fetchLicenses = async (page = 1) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', '20')
      if (search) params.append('search', search)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (planFilter && planFilter !== 'all') params.append('plan', planFilter)

      const response = await fetch(`/api/admin/licenses?${params}`)
      if (!response.ok) throw new Error('Failed to fetch licenses')

      const data = await response.json()
      setLicenses(data.licenses)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching licenses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLicenses()
  }, [search, statusFilter, planFilter])

  const copyLicenseKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      const response = await fetch('/api/admin/licenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (response.ok) {
        fetchLicenses(pagination?.page)
      }
    } catch (error) {
      console.error('Error updating license:', error)
    }
  }

  const deleteLicense = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/licenses/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        fetchLicenses(pagination?.page)
      }
    } catch (error) {
      console.error('Error deleting license:', error)
    }
  }

  const handleExtendLicense = async () => {
    if (!selectedLicenseId) return
    setIsExtending(true)
    try {
      const response = await fetch('/api/admin/licenses/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLicenseId,
          days: parseInt(extendDays),
        }),
      })

      if (response.ok) {
        setIsExtendDialogOpen(false)
        fetchLicenses(pagination?.page)
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to extend license')
      }
    } catch (error) {
      console.error('Error extending license:', error)
      alert('An error occurred while extending license')
    } finally {
      setIsExtending(false)
    }
  }


  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'inactive':
        return 'secondary'
      case 'expired':
        return 'destructive'
      case 'suspended':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-10 stagger-in">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-bhutan-maroon/5 blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-bhutan-maroon flex items-center justify-center shadow-lg shadow-bhutan-maroon/20">
            <Key className="h-7 w-7 text-bhutan-gold" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Ecosystem Licenses</h1>
            <p className="text-sm font-bold text-slate-400">
              Manage and monitor all active platform instances
            </p>
          </div>
        </div>
        <Link href="/admin/licenses/create">
          <Button className="bg-bhutan-maroon hover:bg-bhutan-maroon-dark text-white font-black rounded-xl px-6 h-12 shadow-lg shadow-bhutan-maroon/20 relative z-10">
            <Plus className="mr-2 h-4 w-4" />
            New License
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[300px]">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-bhutan-maroon transition-colors" />
                <Input
                  placeholder="Query by key, customer, or company..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  className="pl-12 h-12 bg-slate-50 border-slate-100 focus:bg-white focus:ring-bhutan-maroon/20 rounded-xl font-bold placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] h-12 rounded-xl font-bold border-slate-100 bg-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100">
                  <SelectItem value="all" className="font-bold">All Status</SelectItem>
                  <SelectItem value="active" className="text-green-600 font-bold">Active</SelectItem>
                  <SelectItem value="inactive" className="text-slate-400 font-bold">Inactive</SelectItem>
                  <SelectItem value="expired" className="text-red-600 font-bold">Expired</SelectItem>
                  <SelectItem value="suspended" className="text-orange-600 font-bold">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[160px] h-12 rounded-xl font-bold border-slate-100 bg-white">
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100">
                  <SelectItem value="all" className="font-bold">All Plans</SelectItem>
                  <SelectItem value="starter" className="font-bold">Starter Kit</SelectItem>
                  <SelectItem value="growth" className="font-bold">Growth Stage</SelectItem>
                  <SelectItem value="enterprise" className="font-bold">Enterprise</SelectItem>
                  <SelectItem value="lifetime" className="font-bold">Lifetime</SelectItem>
                  <SelectItem value="pro" className="font-bold">Legacy Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Licenses Table */}
      <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden mb-12">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 pl-8">Instance ID</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Stakeholder</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Service Tier</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Users</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Pulse</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Validity</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 pr-8 text-right">Operations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 animate-spin text-bhutan-maroon/20" />
                      <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Retrieving Data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : licenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <Key className="h-10 w-10 text-slate-100" />
                      <p className="text-sm font-bold text-slate-400">No active licenses found matching your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                licenses.map((license: License) => (
                  <TableRow key={license._id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="pl-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-bhutan-maroon/5 flex items-center justify-center text-bhutan-maroon group-hover:scale-110 transition-transform duration-500">
                          <Key className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <code className="text-sm font-black text-slate-800 tracking-tight">{license.licenseKey}</code>
                          <button
                            onClick={() => copyLicenseKey(license.licenseKey, license._id)}
                            className="text-[10px] font-bold text-slate-400 hover:text-bhutan-maroon flex items-center gap-1 mt-0.5 transition-colors"
                          >
                            {copiedId === license._id ? (
                              <><Check className="h-3 w-3 text-green-500" /> Copied</>
                            ) : (
                              <><Copy className="h-3 w-3" /> Copy Key</>
                            )}
                          </button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="flex flex-col">
                        <p className="font-black text-slate-800 tracking-tight">{license.customerName}</p>
                        <p className="text-xs font-bold text-slate-400">{license.companyName || license.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <Badge className="bg-bhutan-gold/10 text-bhutan-maroon border-none font-black uppercase tracking-widest text-[9px] px-3 py-1 rounded-full">
                        {license.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-6">
                      <span className="text-sm font-black text-slate-600">
                        {license.maxUsers || 1}
                      </span>
                    </TableCell>
                    <TableCell className="py-6">
                      <Badge className={cn(
                        "font-black uppercase tracking-widest text-[9px] px-3 py-1 rounded-full border-none",
                        license.status === 'active' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {license.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-6">
                      {license.expiryDate ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <Calendar className="h-3.5 w-3.5 text-slate-300" />
                          <span>{new Date(license.expiryDate).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Perpetual</span>
                      )}
                    </TableCell>
                    <TableCell className="py-6 pr-8 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100 transition-colors">
                            <MoreHorizontal className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-slate-100 shadow-2xl">
                          <DropdownMenuItem
                            onClick={() => toggleStatus(license._id, license.status)}
                            className="rounded-xl font-bold text-slate-600 focus:bg-slate-50 focus:text-bhutan-maroon py-3"
                          >
                            <Power className="mr-3 h-4 w-4" />
                            {license.status === 'active' ? 'Force Deactivate' : 'Reactivate Key'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedLicenseId(license._id)
                              setIsExtendDialogOpen(true)
                            }}
                            className="rounded-xl font-bold text-slate-600 focus:bg-slate-50 focus:text-bhutan-maroon py-3"
                          >
                            <Clock className="mr-3 h-4 w-4" />
                            Extend Validity
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/admin/licenses/${license._id}`)}
                            className="rounded-xl font-bold text-slate-600 focus:bg-slate-50 focus:text-bhutan-maroon py-3"
                          >
                            <Edit className="mr-3 h-4 w-4" />
                            Update Metadata
                          </DropdownMenuItem>
                          <div className="h-px bg-slate-100 my-1 mx-1" />
                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e: Event) => e.preventDefault()}
                                className="rounded-xl font-bold text-red-500 focus:bg-red-50 focus:text-red-600 py-3"
                              >
                                <Trash2 className="mr-3 h-4 w-4" />
                                Terminate Instance
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent className="rounded-3xl border-none shadow-2xl">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-black text-slate-900">Confirm Termination</DialogTitle>
                                <DialogDescription className="text-sm font-bold text-slate-500 py-4">
                                  Are you absolutely sure you want to terminate this instance? This will immediately revoke access and delete all activation data.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="ghost" className="font-bold rounded-xl" onClick={() => (document.querySelector('[data-state="open"]') as any)?.click()}>Cancel</Button>
                                <Button
                                  className="bg-red-500 hover:bg-red-600 text-white font-black rounded-xl px-8"
                                  onClick={() => deleteLicense(license._id)}
                                >
                                  Terminate Now
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} licenses
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLicenses(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLicenses(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {/* Extend License Dialog */}
      <Dialog open={isExtendDialogOpen} onOpenChange={setIsExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend License Expiry</DialogTitle>
            <DialogDescription>
              Enter the number of days you want to extend this license for.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="days">Extension Days</Label>
              <Input
                id="days"
                type="number"
                value={extendDays}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtendDays(e.target.value)}
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendLicense} disabled={isExtending}>
              {isExtending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extending...
                </>
              ) : (
                'Extend License'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

