'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'validating' | 'form' | 'success' | 'error'>('validating')
  const [message, setMessage] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [showPasswordReqs, setShowPasswordReqs] = useState(false)

  const passwordReqs = [
    { label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
    { label: 'One uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
    { label: 'One lowercase letter', test: (pw: string) => /[a-z]/.test(pw) },
    { label: 'One number', test: (pw: string) => /\d/.test(pw) },
    { label: 'One special character (!@#$%^&*(),.?":{}|<>)', test: (pw: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
  ]

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No reset token provided.')
      return
    }
    validateToken(token)
  }, [token])

  const validateToken = async (token: string) => {
    try {
      const res = await fetch(`/api/auth/reset-password?token=${token}`)
      const data = await res.json()

      if (data.success) {
        setStatus('form')
      } else {
        setStatus('error')
        setMessage(data.message || 'Invalid or expired reset link.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }

    if (!/[A-Z]/.test(password)) {
      setFormError('Password must contain at least one uppercase letter.')
      return
    }

    if (!/[a-z]/.test(password)) {
      setFormError('Password must contain at least one lowercase letter.')
      return
    }

    if (!/\d/.test(password)) {
      setFormError('Password must contain at least one number.')
      return
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setFormError('Password must contain at least one special character.')
      return
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (data.success) {
        setStatus('success')
        setMessage(data.message)
      } else {
        setFormError(data.message || 'Reset failed.')
      }
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-red-900/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg text-center">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white tracking-tighter italic mb-2">
            SITE <span className="text-amber-400">JINDA</span>
          </h1>
          <div className="h-0.5 w-12 bg-amber-500/50 mx-auto mb-3 rounded-full" />
          <p className="text-slate-500 text-[10px] font-bold tracking-[0.3em] uppercase">
            Password Reset
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-10 shadow-2xl">
          {status === 'validating' && (
            <div className="py-8">
              <div className="h-16 w-16 mx-auto mb-6 relative">
                <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-transparent border-t-amber-400 rounded-full animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Validating reset link...</h2>
              <p className="text-slate-400 text-sm">Please wait.</p>
            </div>
          )}

          {status === 'form' && (
            <div className="text-left">
              <h2 className="text-2xl font-black text-white mb-2 text-center">Set New Password</h2>
              <p className="text-slate-400 text-sm mb-8 text-center">Enter your new password below.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (e.target.value.length > 0) setShowPasswordReqs(true)
                }}
                onFocus={() => password.length > 0 && setShowPasswordReqs(true)}
                placeholder="••••••••"
                required
                className="w-full h-14 px-5 bg-slate-900/50 border border-white/10 rounded-2xl text-white font-medium placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
              />
              {/* Password Requirements */}
              {showPasswordReqs && (
                <div className="bg-slate-900/30 border border-white/5 rounded-xl p-3 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Password Requirements</p>
                  {passwordReqs.map((req, idx) => {
                    const isMet = req.test(password)
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isMet ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-500'}`}>
                          {isMet ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                          )}
                        </div>
                        <span className={`text-xs ${isMet ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                          {req.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full h-14 px-5 bg-slate-900/50 border border-white/10 rounded-2xl text-white font-medium placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                  />
                </div>

                {formError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                    <svg className="h-5 w-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-300 font-bold">{formError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-16 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-900 font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-5 w-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    '🔒 Reset Password'
                  )}
                </button>
              </form>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8">
              <div className="h-20 w-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping" />
                <svg className="h-10 w-10 text-emerald-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-white mb-3">Password Reset!</h2>
              <p className="text-slate-400 text-sm mb-6">{message}</p>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                <p className="text-emerald-300 text-sm font-bold">
                  ✨ Open the Jinda POS app and log in with your new password.
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8">
              <div className="h-20 w-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-white mb-3">Link Expired</h2>
              <p className="text-red-300 text-sm mb-6">{message}</p>
              <p className="text-slate-500 text-xs">
                Go to the POS app and request a new password reset.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10">
          <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.4em]">
            Jinda v1.0.0 — Himalayan Tech
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
