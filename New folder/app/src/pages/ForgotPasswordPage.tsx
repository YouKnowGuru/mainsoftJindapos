import { useState } from 'react';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { AuthService } from '../services/AuthService';

interface ForgotPasswordPageProps {
  onBack: () => void;
  onGoToLogin: () => void;
}

/**
 * ForgotPasswordPage — Request a password reset email.
 * User enters email, server sends a reset link to their browser.
 */
export function ForgotPasswordPage({ onBack, onGoToLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await AuthService.forgotPassword(email.trim().toLowerCase());
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || 'Failed to send reset email.');
      }
    } catch {
      setError('Network error. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] relative overflow-hidden p-6 font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="absolute top-[20%] -right-[10%] w-[500px] h-[500px] bg-red-600/15 blur-[130px] rounded-full animate-pulse pointer-events-none" />
      <div className="absolute bottom-[20%] -left-[10%] w-[500px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg text-center px-4">
        {/* Header */}
        <div className="mb-10 flex flex-col items-center">
          <h1 className="text-4xl font-black text-white tracking-tighter italic">
            JINDA <span className="text-amber-400">POS</span>
          </h1>
          <div className="h-0.5 w-12 bg-amber-500/50 mt-2 mb-4 rounded-full" />
          <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px]">
            Account Recovery
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 md:p-14 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="absolute top-8 left-8 p-3 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>

          {success ? (
            <div className="py-8">
              <div className="h-20 w-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping" />
                <CheckCircle className="h-10 w-10 text-emerald-400 relative z-10" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3">Check Your Email</h2>
              <p className="text-slate-400 font-medium mb-6">
                If an account with <span className="text-amber-400 font-bold">{email}</span> exists,
                we've sent a password reset link.
              </p>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-8 text-left">
                <p className="text-slate-300 text-sm font-medium leading-relaxed">
                  📩 Open the email in your browser.<br />
                  🔒 Click the link and set a new password.<br />
                  ⏰ The link expires in <span className="text-amber-400 font-bold">30 minutes</span>.
                </p>
              </div>
              <button
                onClick={onGoToLogin}
                className="w-full h-16 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-900 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-500/10"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <div className="space-y-8 pt-4">
              {/* Icon */}
              <div className="h-20 w-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto relative">
                <Mail className="h-10 w-10 text-red-400 relative z-10" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-white mb-2">Forgot Password?</h2>
                <p className="text-slate-400 text-sm font-medium">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1 block">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 p-2 bg-white/5 rounded-lg group-focus-within:bg-amber-500/20 transition-colors">
                      <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-amber-400 transition-colors" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full h-16 pl-[4.5rem] pr-6 bg-slate-900/50 border border-white/10 rounded-[1.5rem] text-white font-medium placeholder:text-slate-700 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all shadow-inner"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                    <p className="text-xs text-red-200 font-bold">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="w-full h-16 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-900 font-black text-xs uppercase tracking-[0.2em] rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-500/10 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12">
          <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.4em]">
            Jinda v1.0.0 — Ecosystem Active
          </p>
        </div>
      </div>
    </div>
  );
}
