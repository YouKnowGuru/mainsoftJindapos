'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
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
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Key,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Building,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Customer {
  _id: string
  name: string
  email: string
  company: string
  phone: string
  createdAt: string
  licenseCount: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchCustomers = async (page = 1) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', '20')
      if (search) params.append('search', search)

      const response = await fetch(`/api/admin/customers?${params}`)
      if (!response.ok) throw new Error('Failed to fetch customers')

      const data = await response.json()
      setCustomers(data.customers)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [search])

  const deleteCustomer = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/customers/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        fetchCustomers(pagination?.page)
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
    }
  }

  return (
    <div className="space-y-10 stagger-in">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-bhutan-gold/5 blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-bhutan-maroon flex items-center justify-center shadow-lg shadow-bhutan-maroon/20">
            <Users className="h-7 w-7 text-bhutan-gold" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Stakeholders Registry</h1>
            <p className="text-sm font-bold text-slate-400">
              Verified business partners using Jinda
            </p>
          </div>
        </div>
        <Link href="/admin/licenses/create">
          <Button className="bg-bhutan-maroon hover:bg-bhutan-maroon-dark text-white font-black rounded-xl px-6 h-12 shadow-lg shadow-bhutan-maroon/20 relative z-10">
            <Plus className="mr-2 h-4 w-4" />
            Create License
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1 max-w-xl">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-bhutan-maroon transition-colors" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-12 bg-slate-50 border-slate-100 focus:bg-white focus:ring-bhutan-maroon/20 rounded-xl font-bold placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden mb-12">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 pl-8">Stakeholder</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Venture</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Communication</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Licensing</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Enrolled</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 pr-8 text-right">Ops</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 animate-spin text-bhutan-maroon/20" />
                      <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Accessing Registry...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="h-10 w-10 text-slate-100" />
                      <p className="text-sm font-bold text-slate-400">No stakeholders found in the registry.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer._id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="pl-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-bhutan-maroon flex items-center justify-center text-bhutan-gold shadow-lg group-hover:rotate-6 transition-transform duration-500">
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <p className="font-black text-slate-800 tracking-tight">{customer.name}</p>
                          <p className="text-xs font-bold text-slate-400">{customer.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      {customer.company ? (
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-bhutan-maroon/5 transition-colors">
                            <Building className="h-3.5 w-3.5 text-slate-400 group-hover:text-bhutan-maroon" />
                          </div>
                          <span className="font-black text-slate-700 text-sm tracking-tight">{customer.company}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Individual</span>
                      )}
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <Mail className="h-3.5 w-3.5 text-slate-300" />
                          <span>{customer.email}</span>
                        </div>
                        {customer.phone && (
                          <p className="text-[10px] font-black text-slate-400 ml-5.5">{customer.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <Badge className="bg-bhutan-gold/10 text-bhutan-maroon border-none font-black uppercase tracking-widest text-[9px] px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
                        <Key className="h-3 w-3" />
                        {customer.licenseCount} Active
                      </Badge>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-slate-300" />
                        <span>{new Date(customer.createdAt).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-6 pr-8 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100">
                            <MoreHorizontal className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-slate-100 shadow-2xl">
                          <DropdownMenuItem
                            onClick={() => router.push(`/admin/customers/${customer._id}`)}
                            className="rounded-xl font-bold text-slate-600 focus:bg-slate-50 focus:text-bhutan-maroon py-3"
                          >
                            <Eye className="mr-3 h-4 w-4" />
                            View Registry Entry
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/admin/licenses/create?email=${customer.email}`)}
                            className="rounded-xl font-bold text-slate-600 focus:bg-slate-50 focus:text-bhutan-maroon py-3"
                          >
                            <Key className="mr-3 h-4 w-4" />
                            Issue License
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/admin/customers/${customer._id}/edit`)}
                            className="rounded-xl font-bold text-slate-600 focus:bg-slate-50 focus:text-bhutan-maroon py-3"
                          >
                            <Edit className="mr-3 h-4 w-4" />
                            Update Profile
                          </DropdownMenuItem>
                          <div className="h-px bg-slate-100 my-1 mx-1" />
                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="rounded-xl font-bold text-red-500 focus:bg-red-50 focus:text-red-600 py-3"
                              >
                                <Trash2 className="mr-3 h-4 w-4" />
                                Remove Partner
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent className="rounded-3xl border-none shadow-2xl">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-black text-slate-900">Confirm Removal</DialogTitle>
                                <DialogDescription className="text-sm font-bold text-slate-500 py-4">
                                  Are you sure you want to remove <strong>{customer.name}</strong>? This will also terminate all associated licenses. This action is final.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="ghost" className="font-bold rounded-xl" onClick={() => (document.querySelector('[data-state="open"]') as any)?.click()}>Cancel</Button>
                                <Button
                                  className="bg-red-500 hover:bg-red-600 text-white font-black rounded-xl px-8"
                                  onClick={() => deleteCustomer(customer._id)}
                                >
                                  Terminate Partnership
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
            {pagination.total} customers
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchCustomers(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchCustomers(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
