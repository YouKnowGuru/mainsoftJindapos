'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Package, Save } from 'lucide-react'

interface UpdateData {
    _id: string
    version: string
    notes: string
    downloadUrl: string
    fileUrl: string
    fileSize: number
    fileSha512: string
    releaseDate: string
    isLatest: boolean
}

export default function EditUpdatePage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string

    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        version: '',
        notes: '',
        fileUrl: '',
        fileSize: '',
        fileSha512: '',
        releaseDate: '',
    })

    useEffect(() => {
        fetchUpdate()
    }, [id])

    const fetchUpdate = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`/api/updates/${id}`)
            if (!response.ok) throw new Error('Failed to fetch update')
            const data = await response.json()
            const update: UpdateData = data.update

            setFormData({
                version: update.version || '',
                notes: update.notes || '',
                fileUrl: update.fileUrl || update.downloadUrl || '',
                fileSize: update.fileSize ? String(update.fileSize) : '',
                fileSha512: update.fileSha512 || '',
                releaseDate: update.releaseDate
                    ? new Date(update.releaseDate).toISOString().slice(0, 16)
                    : '',
            })
        } catch (err) {
            setError('Failed to load update data')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)

        try {
            const response = await fetch(`/api/updates/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    version: formData.version,
                    notes: formData.notes,
                    downloadUrl: formData.fileUrl,
                    fileUrl: formData.fileUrl,
                    fileSize: formData.fileSize ? parseInt(formData.fileSize, 10) : 0,
                    fileSha512: formData.fileSha512,
                    releaseDate: formData.releaseDate,
                }),
            })

            if (response.ok) {
                router.push('/admin/updates')
            } else {
                const data = await response.json()
                setError(data.error || 'Failed to update')
            }
        } catch (err) {
            setError('An error occurred. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-10 w-10 animate-spin text-bhutan-maroon/20" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Link href="/admin/updates">
                <Button variant="ghost">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Updates
                </Button>
            </Link>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Edit Software Update
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="version">Version Number *</Label>
                            <Input
                                id="version"
                                value={formData.version}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, version: e.target.value })}
                                placeholder="e.g., 1.0.5"
                                required
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="fileUrl">Download URL (direct link) *</Label>
                                <Input
                                    id="fileUrl"
                                    value={formData.fileUrl}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, fileUrl: e.target.value })}
                                    placeholder="https://github.com/YouKnowGuru/..."
                                    required
                                />
                                <p className="text-xs text-gray-500">
                                    Full direct download URL from GitHub Releases
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fileSize">File Size (bytes)</Label>
                                <Input
                                    id="fileSize"
                                    type="number"
                                    value={formData.fileSize}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, fileSize: e.target.value })}
                                    placeholder="205040356"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fileSha512">SHA-512 Hash</Label>
                            <Input
                                id="fileSha512"
                                value={formData.fileSha512}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, fileSha512: e.target.value })}
                                placeholder="v75J3wD9ztlNJmj7RLAazvK6B0lCEuTNOqfGt29DJs..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="releaseDate">Release Date</Label>
                            <Input
                                id="releaseDate"
                                type="datetime-local"
                                value={formData.releaseDate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, releaseDate: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Release Notes *</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="What's new in this version?"
                                rows={5}
                                required
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                            <Link href="/admin/updates">
                                <Button variant="outline" type="button">
                                    Cancel
                                </Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
