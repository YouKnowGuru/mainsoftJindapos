'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided.')
      return
    }

    verifyEmail(token)
  }, [token])

  const verifyEmail = async (token: string) => {
    try {
      // Use absolute URL to ensure it works from email links
      const apiUrl = typeof window !== 'undefined' &&
        (window.location.hostname.includes('vercel.app') ||
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1')
        ? '' // Use relative URL when on Vercel
        : 'https://dhisum-tseyig.vercel.app' // Use full URL from email links

      const res = await fetch(`${apiUrl}/api/auth/verify-email?token=${token}`)
      const data = await res.json()

      if (data.success) {
        if (data.alreadyVerified) {
          setStatus('already')
          setMessage(data.message)
        } else {
          setStatus('success')
          setMessage(data.message)
        }
      } else {
        setStatus('error')
        setMessage(data.error || data.message || 'Verification failed.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-900/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg text-center">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white tracking-tighter italic mb-2">
            DHISUM <span className="text-amber-400">TSEYIG</span>
          </h1>
          <div className="h-0.5 w-12 bg-amber-500/50 mx-auto mb-3 rounded-full" />
          <p className="text-slate-500 text-[10px] font-bold tracking-[0.3em] uppercase">
            Email Verification
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-10 shadow-2xl">
          {status === 'loading' && (
            <div className="py-8">
              <div className="h-16 w-16 mx-auto mb-6 relative">
                <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-transparent border-t-amber-400 rounded-full animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Verifying your email...</h2>
              <p className="text-slate-400 text-sm">Please wait while we confirm your identity.</p>
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
              <h2 className="text-2xl font-black text-white mb-3">Email Verified!</h2>
              <p className="text-slate-400 text-sm mb-6">{message}</p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                <p className="text-amber-300 text-sm font-bold">
                  ✨ You can now open the Dhisum Tseyig POS app and log in.
                </p>
              </div>
            </div>
          )}

          {status === 'already' && (
            <div className="py-8">
              <div className="h-20 w-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-white mb-3">Already Verified</h2>
              <p className="text-slate-400 text-sm mb-6">{message}</p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                <p className="text-blue-300 text-sm font-bold">
                  Your email was already verified. Just open the POS app and log in.
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
              <h2 className="text-2xl font-black text-white mb-3">Verification Failed</h2>
              <p className="text-red-300 text-sm mb-6">{message}</p>
              <p className="text-slate-500 text-xs">
                The link may have expired. Open the POS app and request a new verification email.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10">
          <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.4em]">
            Dhisum Tseyig v1.0.0 — Himalayan Tech
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
