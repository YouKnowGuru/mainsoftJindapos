import { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, RefreshCw, ArrowLeft, CheckCircle, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { AuthService } from '../services/AuthService';
import type { VerificationStatusResponse } from '../services/AuthService';


interface VerifyEmailPageProps {
  email: string;
  onBack: () => void;
  onVerified: (user: any) => void;
}

/**
 * VerifyEmailPage - Email verification with automatic polling
 * Polls server every 3 seconds to detect verification
 */
export function VerifyEmailPage({ email, onBack, onVerified }: VerifyEmailPageProps) {
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [pollingActive, setPollingActive] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'error'>('pending');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [showVerifiedAnimation, setShowVerifiedAnimation] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const maxPolls = 200; // ~10 minutes at 3 second intervals

  // Clear message after 5 seconds
  useEffect(() => {
    if (message?.type !== 'error') {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Poll for verification status
  const pollVerificationStatus = useCallback(async () => {
    if (!pollingActive || pollCount >= maxPolls) {
      return;
    }

    try {
      setPollCount(prev => prev + 1);

      const response = await AuthService.checkVerificationStatus(email);

      if (response.success && response.verified) {
        // Verification complete!
        setPollingActive(false);
        setVerificationStatus('verified');
        setShowVerifiedAnimation(true);
        setMessage({ text: 'Email verified successfully! Redirecting...', type: 'success' });

        // Stop polling
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }

        // Call onVerified callback after animation
        setTimeout(() => {
          if (response.user) {
            onVerified(response.user);
          }
        }, 1500);

        return;
      }

      // Still pending - update status if needed
      if (response.needsVerification) {
        // Optionally update UI based on server response
        if (!response.canResend && pollCount === 1) {
          setMessage({ text: 'Verification email sent. Please check your inbox.', type: 'info' });
        }
      }

    } catch (err: any) {
      console.error('Polling error:', err);
      // Don't show error on polling - just continue
    }
  }, [email, pollingActive, pollCount, onVerified]);

  // Start polling when component mounts
  useEffect(() => {
    // Initial check
    pollVerificationStatus();

    // Start polling every 3 seconds
    pollingRef.current = setInterval(pollVerificationStatus, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setPollingActive(false);
    };
  }, [pollVerificationStatus]);

  // Manual check button
  const handleCheckStatus = async () => {
    if (isChecking) return;

    setIsChecking(true);
    setMessage(null);

    try {
      const response = await AuthService.checkVerificationStatus(email);

      if (response.success && response.verified) {
        setVerificationStatus('verified');
        setShowVerifiedAnimation(true);
        setMessage({ text: 'Email verified! Redirecting...', type: 'success' });

        // Stop polling
        setPollingActive(false);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }

        setTimeout(() => {
          if (response.user) {
            onVerified(response.user);
          }
        }, 1500);
      } else {
        setMessage({
          text: response.message || 'Still waiting for verification. Please check your email.',
          type: 'info'
        });
      }
    } catch (err: any) {
      setMessage({ text: 'Unable to check status. Are you online?', type: 'error' });
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    if (isResending) return;

    setIsResending(true);
    setMessage(null);

    try {
      const result = await AuthService.resendVerification(email);
      if (result.success) {
        setMessage({
          text: result.message || 'Verification email resent successfully!',
          type: 'success'
        });
      } else {
        setMessage({
          text: result.error || 'Failed to resend. Please try again later.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setMessage({ text: 'Network connection issue. Check your internet.', type: 'error' });
    } finally {
      setIsResending(false);
    }
  };

  const handleStopPolling = () => {
    setPollingActive(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] relative overflow-hidden p-6 font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] bg-blue-600/10 blur-[130px] rounded-full animate-pulse pointer-events-none" />
      <div className="absolute bottom-[20%] -right-[10%] w-[600px] h-[600px] bg-amber-500/5 blur-[120px] rounded-full animate-pulse [animation-delay:2s] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg text-center px-4">
        {/* Header */}
        <div className="mb-10 flex flex-col items-center">
          <h1 className="text-4xl font-black text-white tracking-tighter italic">
            JINDA <span className="text-amber-400">POS</span>
          </h1>
          <div className="h-1 w-16 bg-amber-500/30 grow mt-3 rounded-full" />
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-[40px] border border-white/10 rounded-[3.5rem] p-10 md:p-14 shadow-[24px_24px_80px_-16px_rgba(0,0,0,0.6)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-100 transition-opacity">
            <ShieldCheck className="h-32 w-32 text-blue-500/20 -mr-16 -mt-16" />
          </div>

          <div className="relative z-10">
            {/* Status Icon */}
            {showVerifiedAnimation ? (
              <div className="h-28 w-28 bg-emerald-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 animate-bounce">
                <CheckCircle className="h-14 w-14 text-emerald-400" />
              </div>
            ) : (
              <div className="h-28 w-28 bg-blue-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 relative">
                <Mail className="h-14 w-14 text-blue-400" />
                {pollingActive && (
                  <div className="absolute inset-0 rounded-[2.5rem] border-2 border-blue-400/30 animate-ping" />
                )}
              </div>
            )}

            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
              {showVerifiedAnimation ? 'Email Verified!' : 'Verify Your Email'}
            </h2>
            <p className="text-slate-400 font-medium leading-relaxed mb-8">
              {showVerifiedAnimation
                ? 'Your email has been verified successfully.'
                : `Access to the POS is restricted. Please click the link we sent to ${' '}
                  <span className="text-white font-bold">{email}</span> to continue.`}
            </p>

            {/* Polling Status Indicator */}
            {pollingActive && !showVerifiedAnimation && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                  <span className="text-sm text-blue-400 font-medium">
                    Checking for verification... ({Math.floor(pollCount / 20)}m {Math.floor((pollCount % 20) * 3 / 60)}s)
                  </span>
                </div>
              </div>
            )}

            {/* Status Message */}
            {message && (
              <div className={`mb-8 p-5 rounded-3xl border flex items-start gap-4 text-left animate-in slide-in-from-top-4 duration-300 ${
                message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
                message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                'bg-blue-500/10 border-blue-500/20 text-blue-300'
              }`}>
                {message.type === 'error'
                  ? <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  : <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                }
                <p className="text-sm font-bold leading-snug">{message.text}</p>
              </div>
            )}

            <div className="space-y-4">
              {!showVerifiedAnimation && (
                <>
                  <button
                    onClick={handleCheckStatus}
                    disabled={isChecking || verificationStatus === 'verified'}
                    className="w-full h-16 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/20 disabled:opacity-50 active:scale-95"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-5 w-5" />
                        I've Verified My Email
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleResend}
                    disabled={isResending}
                    className="w-full h-16 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Resend Verification Link
                      </>
                    )}
                  </button>

                  {pollingActive && (
                    <button
                      onClick={handleStopPolling}
                      className="w-full h-12 text-slate-500 hover:text-slate-300 text-xs font-bold tracking-[0.1em] transition-colors"
                    >
                      Stop auto-checking
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-center gap-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 font-black text-[10px] uppercase tracking-[0.2em] transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </button>
        </div>

        {/* Footer */}
        <div className="mt-14">
          <p className="text-[10px] text-slate-700 font-bold uppercase tracking-[0.6em]">
            Identity Safeguard Active
          </p>
          <p className="text-[10px] text-slate-600 mt-2">
            Auto-checking: {pollingActive ? 'ON' : 'OFF'} | Polls: {pollCount}
          </p>
        </div>
      </div>
    </div>
  );
}
