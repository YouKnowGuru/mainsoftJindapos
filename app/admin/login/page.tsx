'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Shield, Eye, EyeOff } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // SECURITY: Validate callbackUrl to prevent open redirect attacks
  const rawCallbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'
  const allowedPaths = ['/admin/dashboard', '/admin/licenses', '/admin/customers', '/admin/messages', '/admin/security', '/admin/settings', '/admin/updates']
  const callbackUrl = allowedPaths.includes(rawCallbackUrl) ? rawCallbackUrl : '/admin/dashboard'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        setError('Invalid username or password')
      } else if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-bhutan-gold/10 blur-[120px] rounded-full animate-float" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-bhutan-maroon/5 blur-[120px] rounded-full animate-float" style={{ animationDelay: '-2s' }} />
      </div>

      <div className="w-full max-w-lg stagger-in relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-bhutan-maroon shadow-2xl shadow-bhutan-maroon/30 mb-6 group hover:rotate-6 transition-transform duration-500">
            <Shield className="h-10 w-10 text-bhutan-gold group-hover:scale-110 transition-transform" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Registry Access</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Jinda Administrative Portal</p>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-xl">
          <CardHeader className="pt-12 pb-8 px-10 text-center">
            <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">Authorized Entry Only</CardTitle>
            <CardDescription className="font-bold text-slate-400 mt-2">
              Please present your administrative credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-sm font-bold animate-float flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Identity Tag</Label>
                <div className="relative group">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-14 bg-slate-100/50 border-transparent focus:bg-white focus:ring-bhutan-maroon/20 rounded-2xl font-bold transition-all px-6"
                    placeholder="Enter admin ID"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" title="Access Key" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Access Key</Label>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 bg-slate-100/50 border-transparent focus:bg-white focus:ring-bhutan-maroon/20 rounded-2xl font-bold transition-all px-6 pr-14"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-xl hover:bg-slate-200 transition-colors text-slate-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-14 bg-bhutan-maroon hover:bg-bhutan-maroon-dark text-white font-black rounded-2xl shadow-xl shadow-bhutan-maroon/20 transition-all active:scale-95 text-lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-3 h-5 w-5" />
                    Enter Command Center
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>


      </div>
    </div>
  )
}
