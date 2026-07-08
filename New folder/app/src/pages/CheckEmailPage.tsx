import { useState } from 'react';
import { Mail, RefreshCw, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { AuthService } from '../services/AuthService';

interface CheckEmailPageProps {
  email: string;
  onBack: () => void;
  onGoToLogin: () => void;
}

/**
 * CheckEmailPage — Shown after account creation.
 * Tells user to verify their email. Includes resend button.
 */
export function CheckEmailPage({ email, onBack, onGoToLogin }: CheckEmailPageProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    setResendMessage(null);

    try {
      const result = await AuthService.resendVerification(email);
      if (result.success) {
        setResendSuccess(true);
        setResendMessage(result.message || 'Verification email sent!');
      } else {
        setResendSuccess(false);
        setResendMessage(result.message || 'Failed to resend. Try again.');
      }
    } catch {
      setResendSuccess(false);
      setResendMessage('Network error. Check your internet.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] relative overflow-hidden p-6 font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="absolute top-[20%] -left-[10%] w-[500px] h-[500px] bg-blue-600/15 blur-[130px] rounded-full animate-pulse pointer-events-none" />
      <div className="absolute bottom-[20%] -right-[10%] w-[500px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg text-center px-4">
        {/* Header */}
        <div className="mb-10 flex flex-col items-center">
          <h1 className="text-4xl font-black text-white tracking-tighter italic">
            JINDA <span className="text-amber-400">POS</span>
          </h1>
          <div className="h-0.5 w-12 bg-amber-500/50 mt-2 mb-4 rounded-full" />
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 md:p-14 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative">
          {/* Mail Icon */}
          <div className="h-24 w-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-pulse" />
            <Mail className="h-12 w-12 text-blue-400 relative z-10" />
          </div>

          <h2 className="text-2xl font-black text-white mb-3">Check Your Email</h2>
          <p className="text-slate-400 font-medium mb-2">
            We sent a verification link to:
          </p>
          <p className="text-amber-400 font-bold text-lg mb-8 break-all">
            {email}
          </p>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-8 text-left">
            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              📩 Open the email and click the verification link.<br />
              🔓 Then come back here and log in.<br />
              ⏰ The link expires in <span className="text-amber-400 font-bold">1 hour</span>.
            </p>
          </div>

          {/* Resend Section */}
          <div className="space-y-4">
            {resendMessage && (
              <div className={`${resendSuccess ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} border rounded-2xl p-4 flex items-center gap-3 animate-in fade-in`}>
                {resendSuccess ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : null}
                <p className={`text-xs font-bold ${resendSuccess ? 'text-emerald-300' : 'text-red-300'}`}>
                  {resendMessage}
                </p>
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={isResending}
              className="w-full h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Resend Verification Email
                </>
              )}
            </button>

            <button
              onClick={onGoToLogin}
              className="w-full h-14 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-900 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-500/10"
            >
              I've Verified — Go to Login
            </button>
          </div>
        </div>

        {/* Back */}
        <div className="mt-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 font-bold text-xs uppercase tracking-widest transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {/* Footer */}
        <div className="mt-10">
          <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.4em]">
            Jinda v1.0.0 — Ecosystem Active
          </p>
        </div>
      </div>
    </div>
  );
}
