'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Key, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function LicenseActivatePage() {
  const [licenseKey, setLicenseKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const resp = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey }),
      })
      const data = await resp.json()
      if (data.success) {
        setStatus('success')
        setMessage('License activated successfully!')
      } else {
        setStatus('error')
        setMessage(data.error || 'Activation failed.')
      }
    } catch (err) {
      setStatus('error')
      setMessage('An error occurred during activation.')
    }
  }

  return (
    <div className="container py-24 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> Activate License
          </CardTitle>
          <CardDescription>Enter your license key to activate Dhisum Tseyig.</CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'success' ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-green-600 font-medium">{message}</p>
              <Button onClick={() => setStatus('idle')} className="w-full">Activate Another</Button>
            </div>
          ) : (
            <form onSubmit={handleActivate} className="space-y-4">
              {status === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="licenseKey">License Key</Label>
                <Input
                  id="licenseKey"
                  placeholder="DTS-XXXX-XXXX-XXXX"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={status === 'loading'}>
                {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Activate Now
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
