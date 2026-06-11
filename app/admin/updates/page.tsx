'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
    Plus,
    RefreshCw,
    ExternalLink,
    CheckCircle2,
    Calendar,
    Loader2,
    Trash2,
    Ban,
    Undo2,
    Rocket,
    AlertTriangle,
    Pencil,
} from 'lucide-react'

interface Update {
    _id: string
    version: string
    notes: string
    downloadUrl: string
    isLatest: boolean
    status: 'draft' | 'published' | 'blocked' | 'rollbacked'
    rolloutPercent: number
    forced: boolean
    createdAt: string
}

export default function UpdatesPage() {
    const [updates, setUpdates] = useState<Update[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const fetchUpdates = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/updates')
            if (!response.ok) throw new Error('Failed to fetch updates')
            const data = await response.json()
            setUpdates(data.updates)
        } catch (error) {
            console.error('Error fetching updates:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchUpdates()
    }, [])

    const deleteUpdate = async (id: string) => {
        if (!confirm('Are you sure you want to delete this update?')) return
        try {
            const response = await fetch(`/api/updates/${id}`, {
                method: 'DELETE',
            })
            if (response.ok) {
                fetchUpdates()
            }
        } catch (error) {
            console.error('Error deleting update:', error)
        }
    }

    const changeStatus = async (id: string, status: string, isLatest?: boolean) => {
        setActionLoading(id)
        try {
            const body: any = { status }
            if (isLatest !== undefined) body.isLatest = isLatest

            const response = await fetch(`/api/updates/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            if (response.ok) {
                fetchUpdates()
            }
        } catch (error) {
            console.error('Error changing status:', error)
        } finally {
            setActionLoading(null)
        }
    }

    const rollbackTo = async (targetId: string) => {
        if (!confirm('Rollback to this version? Current users will downgrade on next restart.')) return

        // Find current latest
        const currentLatest = updates.find(u => u.isLatest && u._id !== targetId)

        setActionLoading(targetId)
        try {
            // Block/rollback current latest
            if (currentLatest) {
                await fetch(`/api/updates/${currentLatest._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'rollbacked', isLatest: false }),
                })
            }

            // Set target as latest published
            await fetch(`/api/updates/${targetId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'published', isLatest: true }),
            })

            fetchUpdates()
        } catch (error) {
            console.error('Error rolling back:', error)
        } finally {
            setActionLoading(null)
        }
    }

    const getStatusBadge = (update: Update) => {
        if (update.status === 'blocked') {
            return (
                <Badge className="bg-red-100 text-red-700 border-none font-black uppercase tracking-widest text-[9px] px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
                    <Ban className="h-3 w-3" />
                    Blocked
                </Badge>
            )
        }
        if (update.status === 'rollbacked') {
            return (
                <Badge className="bg-amber-100 text-amber-700 border-none font-black uppercase tracking-widest text-[9px] px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
                    <Undo2 className="h-3 w-3" />
                    Rollbacked
                </Badge>
            )
        }
        if (update.isLatest && update.status === 'published') {
            return (
                <Badge className="bg-green-100 text-green-700 border-none font-black uppercase tracking-widest text-[9px] px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
                    <CheckCircle2 className="h-3 w-3" />
                    Production
                </Badge>
            )
        }
        if (update.status === 'published') {
            return (
                <Badge className="bg-blue-100 text-blue-700 border-none font-black uppercase tracking-widest text-[9px] px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
                    <Rocket className="h-3 w-3" />
                    Published
                </Badge>
            )
        }
        return (
            <Badge className="bg-slate-100 text-slate-500 border-none font-black uppercase tracking-widest text-[9px] px-3 py-1 rounded-full w-fit">
                Draft
            </Badge>
        )
    }

    return (
        <div className="space-y-10 stagger-in">
            {/* Header */}
            <div className="flex items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-bhutan-gold/5 blur-3xl -mr-32 -mt-32" />
                <div className="relative z-10 flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-bhutan-maroon flex items-center justify-center shadow-lg shadow-bhutan-maroon/20">
                        <RefreshCw className="h-7 w-7 text-bhutan-gold" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Software Releases</h1>
                        <p className="text-sm font-bold text-slate-400">
                            Manage and deploy desktop application versions
                        </p>
                    </div>
                </div>
                <Link href="/admin/updates/create">
                    <Button className="bg-bhutan-maroon hover:bg-bhutan-maroon-dark text-white font-black rounded-xl px-6 h-12 shadow-lg shadow-bhutan-maroon/20 relative z-10">
                        <Plus className="mr-2 h-4 w-4" />
                        Push Update
                    </Button>
                </Link>
            </div>

            {/* Updates Table */}
            <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden mb-12">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-slate-100 hover:bg-transparent">
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 pl-8">Version</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Release Date</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Status</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Rollout</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Source</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 pr-8 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="h-10 w-10 animate-spin text-bhutan-maroon/20" />
                                            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Checking Repositories...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : updates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <RefreshCw className="h-10 w-10 text-slate-100" />
                                            <p className="text-sm font-bold text-slate-400">No release history found.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                updates.map((update: Update) => (
                                    <TableRow key={update._id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                        <TableCell className="pl-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-bhutan-maroon/5 flex items-center justify-center text-bhutan-maroon font-black text-xs">
                                                    v{update.version.split('.')[0]}
                                                </div>
                                                <div>
                                                    <span className="font-black text-slate-800 tracking-tight block">v{update.version}</span>
                                                    {update.forced && (
                                                        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            Forced
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-6">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                <Calendar className="h-3.5 w-3.5 text-slate-300" />
                                                <span>{new Date(update.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-6">
                                            {getStatusBadge(update)}
                                        </TableCell>
                                        <TableCell className="py-6">
                                            <span className="text-xs font-bold text-slate-500">
                                                {update.rolloutPercent || 100}%
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-6">
                                            <a
                                                href={update.downloadUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-xs font-bold text-slate-600 hover:bg-bhutan-maroon hover:text-white transition-all duration-300"
                                            >
                                                <span>Artifact</span>
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </TableCell>
                                        <TableCell className="py-6 pr-8 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {/* Publish button (for draft) */}
                                                {update.status === 'draft' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => changeStatus(update._id, 'published', true)}
                                                        disabled={actionLoading === update._id}
                                                        className="h-9 w-9 rounded-xl text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                                        title="Publish"
                                                    >
                                                        <Rocket className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                {/* Block button (for published/latest) */}
                                                {(update.status === 'published' || update.isLatest) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => changeStatus(update._id, 'blocked', false)}
                                                        disabled={actionLoading === update._id}
                                                        className="h-9 w-9 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 transition-all"
                                                        title="Block"
                                                    >
                                                        <Ban className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                {/* Rollback button (for non-latest published) */}
                                                {update.status === 'published' && !update.isLatest && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => rollbackTo(update._id)}
                                                        disabled={actionLoading === update._id}
                                                        className="h-9 w-9 rounded-xl text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-all"
                                                        title="Rollback to this version"
                                                    >
                                                        <Undo2 className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                {/* Edit button */}
                                                <Link href={`/admin/updates/edit/${update._id}`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>

                                                {/* Delete button */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteUpdate(update._id)}
                                                    className="h-9 w-9 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
