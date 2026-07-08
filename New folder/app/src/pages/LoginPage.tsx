import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { AuthService } from '../services/AuthService';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  onForgotPassword?: () => void;
  onResendVerification?: (email: string) => void;
  onVerificationNeeded?: (email: string) => void;
  onDeviceVerificationNeeded?: (email: string, password: string, deviceId?: string, deviceInfo?: any) => void;
}

/**
 * LoginPage Component - User authentication screen
 * Now supports email-based login via server API with offline fallback to local auth.
 * Includes forgot password link and unverified email handling.
 */
export function LoginPage({ onLogin, onForgotPassword, onResendVerification, onVerificationNeeded, onDeviceVerificationNeeded }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setResendMessage('');
    setIsLoading(true);

    try {
      // Try server-side login first (validates email verification)
      const serverResult = await AuthService.login(email, password);
      if (serverResult.success && serverResult.tokens) {
        // Server login successful — save tokens
        if (window.electronSecureAPI?.secureStorage) {
          await window.electronSecureAPI.secureStorage.setTokens(serverResult.tokens);
        }

        // Also do local login for offline capability
        const localEmail = serverResult.user?.email || email;
        let localResult = await onLogin(localEmail, password);

        if (!localResult.success) {
          // If local login failed with the same password that just worked for SaaS,
          // it likely means the local password is out of sync (e.g. after a reset).
          if (window.electronSecureAPI?.auth) {
            const syncResult = await window.electronSecureAPI.auth.syncPassword({ email: localEmail, password });

            if (syncResult.success) {
              localResult = await onLogin(localEmail, password);
            }
          }
        }
        return;
      }

      // Handle unverified email
      if (serverResult.needsVerification) {
        if (onVerificationNeeded) {
          onVerificationNeeded(serverResult.email || email);
        } else {
          setNeedsVerification(true);
          setUnverifiedEmail(serverResult.email || email);
        }
        setError('');
        return;
      }

      // Handle device step-up verification (new device detected)
      if (serverResult.needsStepUp && serverResult.stepUpType === 'device_verification') {
        if (onDeviceVerificationNeeded) {
          // IMPORTANT: Pass the actual email AND password the user typed, not the masked one from server
          onDeviceVerificationNeeded(email, password);
        } else {
          // Fallback: show error message
          setError('New device detected. Please verify with the code sent to your email.');
        }
        return;
      }

      // SECURITY: Use generic error messages to prevent account enumeration attacks.
      // Do NOT reveal whether email exists, account state, or password correctness.
      const msgLower = serverResult.message?.toLowerCase() || '';

      // Account state errors (locked, terminated, suspended, expired, unverified)
      // Show same generic message to prevent enumeration
      if (serverResult.locked || serverResult.retryAfter ||
          msgLower.includes('terminated') || msgLower.includes('permanently closed') ||
          msgLower.includes('suspended') || msgLower.includes('disabled') ||
          msgLower.includes('restricted') || msgLower.includes('deactivated') ||
          msgLower.includes('account locked') || msgLower.includes('too many') ||
          msgLower.includes('rate limit') || msgLower.includes('try again later') ||
          msgLower.includes('trial') || msgLower.includes('expir') ||
          msgLower.includes('verify your email') || msgLower.includes('email not verified')) {
        setError('Unable to sign in. Please check your credentials or contact support if the problem persists.');
        return;
      }

      // Device verification needed — this is a legitimate flow, not an error
      if (msgLower.includes('new device') || msgLower.includes('device mismatch') || msgLower.includes('verify with the code')) {
        setError('New device detected. Please verify with the code sent to your email.');
        return;
      }

      // Server unreachable — try local auth fallback
      if (serverResult.message?.includes('Unable to reach') || serverResult.message?.includes('network') || serverResult.message?.includes('connection')) {
        const localResult = await onLogin(email, password);
        if (!localResult.success) {
          setError('Unable to sign in. Please check your credentials or contact support if the problem persists.');
        }
        return;
      }

      // Fallback: generic error for all other cases (wrong password, not found, etc.)
      setError('Unable to sign in. Please check your credentials or contact support if the problem persists.');
    } catch (err: any) {
      // Network/unexpected error — fallback to local auth
      const errMsg = err?.message?.toLowerCase() || '';

      // Account state errors — same generic message
      if (errMsg.includes('terminated') || errMsg.includes('permanently closed') ||
          errMsg.includes('suspended') || errMsg.includes('restricted') ||
          errMsg.includes('disabled') || errMsg.includes('locked') ||
          errMsg.includes('too many') || errMsg.includes('trial') ||
          errMsg.includes('expir') || errMsg.includes('verify')) {
        setError('Unable to sign in. Please check your credentials or contact support if the problem persists.');
        return;
      }

      // Fallback to local auth on network error
      try {
        const localResult = await onLogin(email, password);
        if (!localResult.success) {
          setError('Unable to sign in. Please check your credentials or contact support if the problem persists.');
        }
      } catch {
        setError('Unable to sign in. Please check your credentials or contact support if the problem persists.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendMessage('');
    try {
      const result = await AuthService.resendVerification(unverifiedEmail);
      setResendMessage(result.message || 'Verification email sent!');
      if (onResendVerification) {
        onResendVerification(unverifiedEmail);
      }
    } catch {
      setResendMessage('Failed to resend. Check your internet.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-bhutan-maroon opacity-20 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-bhutan-orange opacity-10 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-10 flex flex-col items-center">
          <Logo size="xl" className="mb-6" />
          <div className="inline-block p-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 mb-4 shadow-2xl">
            <h1 className="text-4xl font-black tracking-tighter text-white">
              <span className="text-bhutan-gold">Jinda</span>
            </h1>
          </div>
          <p className="text-slate-400 font-medium tracking-wide uppercase text-[10px]">Premium Accounting & POS Solution</p>
        </div>

        {/* Login Form */}
        <div className="glass-dark rounded-[32px] p-10 border border-white/10 shadow-3xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Welcome
            </h2>
            <p className="text-slate-400 text-sm">Sign in to manage your business</p>
          </div>

          {/* Unverified Email Notice */}
          {needsVerification && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-200 font-bold mb-1">Email Not Verified</p>
                  <p className="text-xs text-amber-300/70 leading-relaxed">
                    Please check your email ({unverifiedEmail}) and click the verification link before logging in.
                  </p>
                </div>
              </div>
              {resendMessage && (
                <p className="text-xs text-emerald-400 font-bold pl-8">{resendMessage}</p>
              )}
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full h-12 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isResending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  <><RefreshCw className="h-4 w-4" /> Resend Verification Email</>
                )}
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && !needsVerification && (
            <div className="mb-6 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-300 font-bold mb-1">Login Failed</p>
                  <p className="text-xs text-red-400/90 leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-bhutan-gold transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-bhutan-gold/50 focus:border-bhutan-gold/50 text-white placeholder:text-slate-600 transition-all outline-none"
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-bhutan-gold transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-bhutan-gold/50 focus:border-bhutan-gold/50 text-white placeholder:text-slate-600 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            {onForgotPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs text-amber-500 hover:text-amber-400 font-bold uppercase tracking-widest transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-bhutan-gold text-bhutan-maroon py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-bhutan-gold/10 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-bhutan-maroon/30 border-t-bhutan-maroon rounded-full animate-spin"></span>
                  Verifying...
                </span>
              ) : (
                'Access System'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center space-y-2">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
            Precision Accounting • Security First • Local compliance
          </p>
        </div>
      </div>
    </div>
  );
}
