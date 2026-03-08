'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Check, Copy, Key } from 'lucide-react'

export default function CreateLicensePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [createdLicense, setCreatedLicense] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState({
    customerName: '',
    email: '',
    companyName: '',
    plan: 'starter',
    maxUsers: 1,
    expiryDate: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        setCreatedLicense(data.license)
      } else {
        setError(data.error || 'Failed to create license')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyLicenseKey = () => {
    if (createdLicense?.licenseKey) {
      navigator.clipboard.writeText(createdLicense.licenseKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isSuccess && createdLicense) {
    return (
      <div className="space-y-6">
        <Link href="/admin/licenses">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Licenses
          </Button>
        </Link>

        <Card className="max-w-lg mx-auto">
          <CardContent className="p-6 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">License Created!</h2>
            <p className="text-muted-foreground mb-6">
              The license has been created successfully. Share this key with your customer.
            </p>

            <div className="bg-muted rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-2">License Key</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-xl font-mono font-bold">{createdLicense.licenseKey}</code>
                <button
                  onClick={copyLicenseKey}
                  className="p-2 hover:bg-background rounded-md transition-colors"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-left bg-muted rounded-lg p-4 mb-6">
              <p><strong>Customer:</strong> {createdLicense.customerName}</p>
              <p><strong>Email:</strong> {createdLicense.email}</p>
              <p><strong>Plan:</strong> {createdLicense.plan}</p>
              {createdLicense.expiryDate && (
                <p>
                  <strong>Expires:</strong>{' '}
                  {new Date(createdLicense.expiryDate).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <Button onClick={() => router.push('/admin/licenses')} className="flex-1">
                View All Licenses
              </Button>
              <Button variant="outline" onClick={() => {
                setIsSuccess(false)
                setCreatedLicense(null)
                setFormData({
                  customerName: '',
                  email: '',
                  companyName: '',
                  plan: 'starter',
                  maxUsers: 1,
                  expiryDate: '',
                })
              }}>
                Create Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/licenses">
        <Button variant="ghost">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Licenses
        </Button>
      </Link>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Create New License
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Acme Inc."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="plan">Plan *</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(value) => {
                    let maxUsers = 1;
                    if (value === 'growth' || value === 'pro') maxUsers = 2;
                    else if (value === 'enterprise' || value === 'lifetime') maxUsers = 5;
                    setFormData({ ...formData, plan: value, maxUsers });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter (Nu 9,999/1-yr - 1 User)</SelectItem>
                    <SelectItem value="growth">Growth (Nu 14,999/2-yr - 2 Users)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (Nu 19,999/3-yr - 5 Users)</SelectItem>
                    <SelectItem value="lifetime">Lifetime (Nu 25,000 - 5 Users)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Max Users *</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={formData.maxUsers}
                  onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) })}
                  min={1}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">
                  Expiry Date {formData.plan !== 'lifetime' && '*'}
                </Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  required={formData.plan !== 'lifetime'}
                  disabled={formData.plan === 'lifetime'}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create License'
                )}
              </Button>
              <Link href="/admin/licenses">
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
