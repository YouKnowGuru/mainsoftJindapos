import { useState, useEffect, useCallback } from 'react';
import { Key, AlertCircle, CheckCircle, Loader2, Zap, ArrowLeft, LogIn, RotateCcw } from 'lucide-react';
import { Logo } from '../components/Logo';

/**
 * License Activation Page
 * Enhanced with back navigation, login diversion, and smarter error handling.
 * Premium dark design consistent with the Jinda brand.
 */
interface LicenseActivationPageProps {
    onActivated: (isRecovery?: boolean) => void;
    onBack: () => void;
    onShowLogin: () => void;
    isTrialExpired: boolean;
}

export function LicenseActivationPage({
    onActivated,
    onBack,
    onShowLogin,
    isTrialExpired,
}: LicenseActivationPageProps) {
    const [licenseKey, setLicenseKey] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [isActivating, setIsActivating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [needsLogin, setNeedsLogin] = useState(false);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [showCredentialsInput, setShowCredentialsInput] = useState(false);
    const [maskedEmail, setMaskedEmail] = useState('');
    const [serverMessage, setServerMessage] = useState('');
    const [transfersRemaining, setTransfersRemaining] = useState<number | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    // Countdown timer for resend cooldown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

  // Resend OTP: re-submit with password only (no otp) to trigger a new code
  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || isResending) return;

    // Check if running in Electron
    if (typeof window === 'undefined' || !window.electronSecureAPI?.license?.activate) {
      setError('License activation is only available in the desktop application.');
      return;
    }

    setIsResending(true);
    setError(null);
    setResendSuccess(false);
    try {
      const result = await window.electronSecureAPI.license.activate(
        licenseKey.trim(),
        undefined, // no OTP — server will generate + send a new one
        password
      );
            if (result.error === 'OTP_REQUIRED') {
                setOtp('');
                setResendSuccess(true);
                setResendCooldown(30);
                setTimeout(() => setResendSuccess(false), 3000);
            } else {
                setError(result.message || 'Failed to resend code. Please try again.');
            }
        } catch {
            setError('Unable to connect to license server.');
        } finally {
            setIsResending(false);
        }
    }, [resendCooldown, isResending, licenseKey, password]);

  // Device fingerprint helper (matches the one in AuthService)
  const generateDeviceFingerprint = (): object => {
    return {
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
    };
  };

  const handleActivate = async () => {
    if (isActivating) return;

    // Check if running in Electron
    if (typeof window === 'undefined' || !window.electronSecureAPI?.license?.activate) {
      setError('License activation is only available in the desktop application.');
      return;
    }

    if (!licenseKey.trim()) {
      setError('Please enter your license key.');
      return;
    }

    if (showCredentialsInput && !password.trim()) {
      setError('Please enter your account password.');
      return;
    }

    if (showOtpInput && !otp.trim()) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setError(null);
    setIsActivating(true);

    try {
      // Call activate with license and optional OTP/Password
      const result = await window.electronSecureAPI.license.activate(
        licenseKey.trim(),
        showOtpInput ? otp : undefined,
        showCredentialsInput || showOtpInput ? password : undefined,
        generateDeviceFingerprint()
      );

            if (result.success) {
                setSuccess(true);
                if (result.isFirstActivation === false) {
                    setNeedsLogin(true);
                } else {
                    setTimeout(() => onActivated(false), 1500);
                }
            } else if (result.error === 'CREDENTIALS_REQUIRED') {
                // Transition to Identity Verification state
                setShowCredentialsInput(true);
                setError(null);
                setServerMessage(result.message || '');
                setMaskedEmail(result.email || '');
                setTransfersRemaining(result.transfersRemaining ?? null);
            } else if (result.error === 'OTP_REQUIRED') {
                // Transition to OTP state
                setShowOtpInput(true);
                setShowCredentialsInput(false);
                setError(null);
                setServerMessage(result.message || '');
                setMaskedEmail(result.email || '');
            } else {
                // Generic or specific error
                setError(result.message);
                if (result.error === 'INVALID_OTP') {
                    setOtp('');
                }
                if (result.error === 'INVALID_CREDENTIALS') {
                    setPassword('');
                }
            }
        } catch (err: any) {
            setError('Unable to connect to license server. Check your internet.');
        } finally {
            setIsActivating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleActivate();
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#020617] relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-red-900/10 blur-[150px] rounded-full pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse duration-3000" />
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            <div className="relative z-10 w-full max-w-xl px-4">
                {/* Header Section */}
                <div className="text-center mb-10 flex flex-col items-center">
                    <Logo size="lg" className="mb-6" />
                    <h1 className="text-4xl font-black text-white tracking-tighter italic">
                        JINDA <span className="text-amber-400">POS</span>
                    </h1>
                    <div className="h-0.5 w-12 bg-amber-500/50 mt-2 mb-4 rounded-full" />
                    <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px]">
                        Secure License Activation
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 md:p-14 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative">

                    {/* Back Button */}
                    {!success && (
                        <button
                            onClick={showOtpInput || showCredentialsInput ? () => {
                                setShowOtpInput(false);
                                setShowCredentialsInput(false);
                            } : onBack}
                            className="absolute top-8 left-8 p-3 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all group"
                            title="Go Back"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        </button>
                    )}

                    {/* Content Section */}
                    {success ? (
                        <div className="py-10 text-center animate-in fade-in zoom-in duration-500">
                            <div className="h-24 w-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                                <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping" />
                                <CheckCircle className="h-12 w-12 text-emerald-400 relative z-10" />
                            </div>

                            {needsLogin ? (
                                <>
                                    <h3 className="text-2xl font-black text-white mb-2 italic">Activation Successful</h3>
                                    <p className="text-slate-400 font-medium mb-1">
                                        Your device is now linked.
                                    </p>
                                    {transfersRemaining !== null && (
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-10">
                                            Monthly transfers remaining: {transfersRemaining}
                                        </p>
                                    )}
                                    <button
                                        onClick={() => onActivated(true)}
                                        className="w-full h-16 bg-white text-slate-900 font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 hover:bg-amber-400"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        Continue to POS
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-2xl font-black text-white mb-2 italic">Activation Successful</h3>
                                    <p className="text-slate-400 font-medium tracking-wide animate-pulse">
                                        Ready to start...
                                    </p>
                                </>
                            )}
                        </div>
                    ) : showCredentialsInput ? (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-6 flex items-start gap-4">
                                <div className="p-2 bg-amber-500/20 rounded-xl">
                                    <Zap className="h-5 w-5 text-amber-400 shrink-0" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white italic tracking-tight">Step 1: Identity Verification</p>
                                    <p className="text-xs text-amber-200/80 mt-1 font-medium leading-relaxed">
                                        {serverMessage || `This license is already bound. To authorize a transfer, enter the password for the account email.`}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1 block">
                                    Account Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="••••••••"
                                    disabled={isActivating}
                                    className="w-full h-16 px-6 bg-slate-900/50 border border-white/10 rounded-[1.5rem] text-white font-medium text-lg focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all"
                                />
                                {transfersRemaining !== null && (
                                    <p className="text-[10px] text-red-400/60 font-bold uppercase tracking-widest text-center">
                                        Device transfers remaining: {transfersRemaining}
                                    </p>
                                )}
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center gap-4 animate-in shake duration-500">
                                    <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                                    <p className="text-xs text-red-200 font-bold italic">{error}</p>
                                </div>
                            )}

                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={handleActivate}
                                    disabled={isActivating || !password.trim()}
                                    className="h-20 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-[0.25em] rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50"
                                >
                                    {isActivating ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Verifying Identity...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="h-5 w-5" />
                                            Verify & Send Code
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={onShowLogin}
                                    className="h-12 text-[10px] text-slate-500 font-black uppercase tracking-widest hover:text-slate-300 transition-colors"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </div>
                    ) : showOtpInput ? (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-6 flex items-start gap-4">
                                <div className="p-2 bg-emerald-500/20 rounded-xl">
                                    <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white italic tracking-tight">Step 2: Security Code</p>
                                    <p className="text-xs text-emerald-200/80 mt-1 font-medium leading-relaxed">
                                        Identity confirmed! A 6-digit code has been sent to <strong className="text-white">{maskedEmail || 'your email'}</strong>.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1 block">
                                    Verification Code (OTP)
                                </label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    onKeyDown={handleKeyDown}
                                    placeholder="000 000"
                                    disabled={isActivating}
                                    className="w-full h-20 text-center bg-slate-900/50 border border-white/10 rounded-[1.5rem] text-white font-black text-3xl tracking-[0.5em] placeholder:text-slate-800 placeholder:tracking-normal focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all"
                                />
                                {transfersRemaining !== null && (
                                    <p className="text-[10px] text-red-400/60 font-bold uppercase tracking-widest text-center">
                                        Device transfers remaining this month: {transfersRemaining}
                                    </p>
                                )}
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center gap-4 animate-in shake duration-500">
                                    <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                                    <p className="text-xs text-red-200 font-bold italic">{error}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    onClick={handleActivate}
                                    disabled={isActivating || otp.length < 6}
                                    className="h-20 bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-black text-xs uppercase tracking-[0.25em] rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/10 disabled:opacity-50"
                                >
                                    {isActivating ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Authenticating...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-5 w-5" />
                                            Verify & Link Device
                                        </>
                                    )}
                                </button>

                                {/* Resend Code */}
                                <div className="flex flex-col items-center gap-2">
                                    {resendSuccess && (
                                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest animate-in fade-in duration-300">
                                            ✓ New code sent to your email!
                                        </p>
                                    )}
                                    <button
                                        onClick={handleResend}
                                        disabled={resendCooldown > 0 || isResending}
                                        className="h-12 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-40"
                                        style={{ color: resendCooldown > 0 ? '#475569' : '#94a3b8' }}
                                    >
                                        {isResending ? (
                                            <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
                                        ) : resendCooldown > 0 ? (
                                            <>Resend in {resendCooldown}s</>
                                        ) : (
                                            <><RotateCcw className="w-3 h-3" /> Resend Code</>
                                        )}
                                    </button>
                                </div>

                                <button
                                    onClick={() => setShowOtpInput(false)}
                                    className="h-14 text-[10px] text-slate-500 font-black uppercase tracking-widest hover:text-slate-300 transition-colors"
                                >
                                    Use Different Key
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-500">
                            {/* Alert for trials or expired states */}
                            {isTrialExpired && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-6 flex items-start gap-4">
                                    <div className="p-2 bg-red-500/20 rounded-xl">
                                        <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white italic tracking-tight">Requirement: License Needed</p>
                                        <p className="text-xs text-red-400/80 mt-1 font-medium leading-relaxed">
                                            The evaluation period has concluded. To preserve your data and continue operations, please activate a license.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Input Group */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1 block">
                                    Digital License Key
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2 bg-white/5 rounded-lg group-focus-within:bg-amber-500/20 transition-colors">
                                        <Key className="h-4 w-4 text-slate-400 group-focus-within:text-amber-400 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={licenseKey}
                                        onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                                        onKeyDown={handleKeyDown}
                                        placeholder="DTS-XXXX-XXXX-XXXX"
                                        disabled={isActivating}
                                        className="w-full h-16 pl-20 pr-6 bg-slate-900/50 border border-white/10 rounded-[1.5rem] text-white font-mono text-lg tracking-widest placeholder:text-slate-700 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/40 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Error Messaging */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                                    <p className="text-xs text-red-200 font-bold italic">{error}</p>
                                </div>
                            )}

                            {/* CTAs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={handleActivate}
                                    disabled={isActivating || !licenseKey.trim()}
                                    className="md:col-span-2 h-20 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-[0.25em] rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/10 disabled:opacity-50 ring-4 ring-amber-500/10"
                                >
                                    {isActivating ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Verifying Integrity...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="h-5 w-5" />
                                            Unlock Full Access
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={onShowLogin}
                                    className="h-16 bg-white/5 border border-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Existing Account?
                                </button>

          <button
            onClick={() => {
              const url = 'https://jinda.com/contact';
              if (typeof window !== 'undefined' && window.electronSecureAPI?.shell?.openExternal) {
                window.electronSecureAPI.shell.openExternal(url);
              } else {
                window.open(url, '_blank');
              }
            }}
                                    className="h-16 bg-white/5 border border-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-center"
                                >
                                    Support Needed?
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="mt-12 text-center space-y-4">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">
                        Jinda v1.0.0 — Ecosystem Active
                    </p>
                    <div className="flex items-center justify-center gap-6">
                        <div className="h-px w-10 bg-slate-800" />
                        <div className="h-2 w-2 bg-red-800 rotate-45" />
                        <div className="h-px w-10 bg-slate-800" />
                    </div>
                </div>
            </div>
        </div>
    );
}
