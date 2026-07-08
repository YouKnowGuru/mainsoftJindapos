import { useState } from 'react';
import { UserPlus, Shield, Loader2, CheckCircle, AlertCircle, User, Lock, Mail, UserCircle, ArrowLeft, LogIn } from 'lucide-react';
import { AuthService } from '../services/AuthService';

interface SetupAccountPageProps {
    onAccountCreated: (username: string, password: string, email: string) => void;
    onBack?: () => void;
    onShowLogin?: () => void;
}

/**
 * SetupAccountPage - Initial System Initialization
 * Now integrates with server-side registration + email verification.
 * Creates account both locally (SQLite) and remotely (MongoDB).
 * Featuring a Bhutanese "Endless Knot" (Srivatsa) aesthetic.
 */
export function SetupAccountPage({ onAccountCreated, onBack, onShowLogin }: SetupAccountPageProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);

  const passwordReqs = [
    { label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
    { label: 'One uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
    { label: 'One lowercase letter', test: (pw: string) => /[a-z]/.test(pw) },
    { label: 'One number', test: (pw: string) => /\d/.test(pw) },
    { label: 'One special character (!@#$%^&*(),.?":{}|<>)', test: (pw: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
  ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.username || !formData.password || !formData.fullName || !formData.email) {
            setError('Please fill in all fields.');
            return;
        }

        // Full name validation - only letters, spaces, hyphens, and apostrophes
        const nameRegex = /^[a-zA-Z\s\-\']+$/;
        if (!nameRegex.test(formData.fullName)) {
            setError('Full name can only contain letters, spaces, hyphens, and apostrophes.');
            return;
        }

        if (formData.fullName.trim().length < 2) {
            setError('Full name must be at least 2 characters.');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!/[A-Z]/.test(formData.password)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }

    if (!/[a-z]/.test(formData.password)) {
      setError('Password must contain at least one lowercase letter.');
      return;
    }

    if (!/\d/.test(formData.password)) {
      setError('Password must contain at least one number.');
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      setError('Password must contain at least one special character.');
      return;
    }

        setIsSubmitting(true);
        try {
            // 1. Get device/license info - always use the REAL hardware ID from IPC bridge
            let deviceId: string | undefined;
            let licenseKey: string | undefined;
            if (window.electronSecureAPI) {
                // Get the true hardware-based machine ID via the secure bridge
                try {
                    deviceId = await window.electronSecureAPI.app.getDeviceId();
                } catch (e) {
                    console.warn('[Setup] Failed to get hardware device ID, falling back to license status');
                }
                // Also get the license key if available
                try {
                    const licenseStatus = await window.electronSecureAPI.license.getStatus();
                    licenseKey = licenseStatus?.licenseKey;
                    // Only use licenseStatus.deviceId as final fallback
                    if (!deviceId) deviceId = licenseStatus?.deviceId;
                } catch (e) {
                    console.warn('[Setup] Failed to get license status');
                }
            }

            // 2. Register on server (MongoDB + email verification) FIRST
            const serverResult = await AuthService.register(
                formData.username,
                formData.email,
                formData.password,
                { deviceId, licenseKey }
            );

    // Check if server rejected it with a specific validation error
    if (!serverResult.success) {
      const msg = serverResult.message || '';
      const isNetworkError = msg.includes('Unable to reach') || msg.includes('fetch') || msg.includes('network');

      if (!isNetworkError) {
        // Parse specific error messages from server
        let errorMsg = msg || 'Registration failed. Please try again.';
        
        // Check for specific error patterns and provide clearer messages
        if (msg.toLowerCase().includes('email') && (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists'))) {
          errorMsg = 'This email is already registered. Please use a different email or try logging in.';
        } else if (msg.toLowerCase().includes('username') && (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('taken'))) {
          errorMsg = 'This username is already taken. Please choose a different username.';
        } else if (msg.toLowerCase().includes('account') && msg.toLowerCase().includes('lock')) {
          errorMsg = 'Account is temporarily locked due to too many failed attempts. Please try again later.';
        } else if (msg.toLowerCase().includes('suspended') || msg.toLowerCase().includes('disabled')) {
          errorMsg = 'Account access has been restricted. Please contact support for assistance.';
        }
        
        // Server sent a real error — show it and STOP
        // Do not create local user to avoid triggering the local user limit on next attempt
        setError(errorMsg);
        setIsSubmitting(false);
        return;
      } else {
        console.warn('[Setup] Server unreachable, proceeding with local-only account:', msg);
      }
    }

// 3. Create local account only AFTER server validation passes (or if server is offline)
    let localResult = { success: true, message: '' };
    if (window.electronSecureAPI) {
      // Use createInitialUser for first account setup (no auth required)
      localResult = await window.electronSecureAPI.settings.createInitialUser({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    fullName: formData.fullName,
                    role: 'admin'
                });

                if (!localResult.success) {
                    // If local fails (e.g. limit reached), we must stop
                    setError(localResult.message || 'Failed to create local account.');
                    setIsSubmitting(false);
                    return;
                }
            }

            // Both creations succeeded (or server was offline and local succeeded)
            setIsSuccess(true);
            setTimeout(() => {
                onAccountCreated(formData.username, formData.password, formData.email);
            }, 1500);

        } catch (err: any) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#020617] relative overflow-hidden p-6 font-sans">
            {/* --- Premium Background Layer --- */}
            {/* Animated Grain */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            {/* Dynamic Orbs */}
            <div className="absolute -top-[10%] -right-[5%] w-[500px] h-[500px] bg-red-600/20 blur-[120px] rounded-full animate-pulse pointer-events-none" />
            <div className="absolute -bottom-[10%] -left-[5%] w-[500px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s] pointer-events-none" />

            {/* Bhutanese Endless Knot SVG Background (Stylized & Large) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] text-white fill-current">
                    <path d="M50 5L35 20L50 35L65 20L50 5ZM20 35L5 50L20 65L35 50L20 35ZM80 35L65 50L80 65L95 50L80 35ZM50 65L35 80L50 95L65 80L50 65ZM50 35L35 50L50 65L65 50L50 35Z" />
                </svg>
            </div>

            <div className="relative z-10 w-full max-w-2xl px-4">
                {/* Header Section */}
                <div className="text-center mb-10">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-red-600 to-red-900 border border-white/20 shadow-2xl mb-6 group transition-transform hover:scale-110 active:scale-95 cursor-default">
                        <Shield className="h-10 w-10 text-amber-400 group-hover:rotate-12 transition-transform" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                        System <span className="text-amber-400">Setup</span>
                    </h1>
                    <p className="text-slate-400 font-medium max-w-md mx-auto">
                        Welcome to Jinda. Let's create your master administrator account to get started.
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white/5 backdrop-blur-[40px] border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    {/* Back Button */}
                    {!isSuccess && onBack && (
                        <button
                            onClick={onBack}
                            className="absolute top-8 left-8 p-3 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        </button>
                    )}

                    {/* Success Overlay */}
                    {isSuccess ? (
                        <div className="py-20 text-center animate-in fade-in zoom-in duration-700">
                            <div className="h-24 w-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                                <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping" />
                                <CheckCircle className="h-12 w-12 text-emerald-400 relative z-10" />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-3">Account Created!</h2>
                            <p className="text-slate-400 font-medium text-lg">Redirecting to email verification...</p>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Full Name */}
                                    <div className="md:col-span-2 space-y-3">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1 ml-1 flex items-center gap-2">
                                            <UserCircle className="w-3 h-3 text-amber-500" />
                                            Your Full Name
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                required
                                                value={formData.fullName}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    // Only allow letters, spaces, hyphens, and apostrophes
                                                    if (val === '' || /^[a-zA-Z\s\-']*$/.test(val)) {
                                                        setFormData({ ...formData, fullName: val });
                                                    }
                                                }}
                                                placeholder="e.g. Tashi Dorji"
                                                className="w-full h-16 px-6 bg-slate-900/50 border border-white/10 rounded-2xl text-white font-bold text-lg placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all hover:bg-slate-900/80 shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* Login ID */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1 ml-1 flex items-center gap-2">
                                            <User className="w-3 h-3 text-amber-500" />
                                            Create Login ID
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            placeholder="admin"
                                            className="w-full h-16 px-6 bg-slate-900/50 border border-white/10 rounded-2xl text-white font-bold text-lg placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all hover:bg-slate-900/80 shadow-inner"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1 ml-1 flex items-center gap-2">
                                            <Mail className="w-3 h-3 text-amber-500" />
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="you@example.com"
                                            className="w-full h-16 px-6 bg-slate-900/50 border border-white/10 rounded-2xl text-white font-bold text-lg placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all hover:bg-slate-900/80 shadow-inner"
                                        />
                                    </div>

          {/* Password */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1 ml-1 flex items-center gap-2">
                  <Lock className="w-3 h-3 text-amber-500" />
                  Set Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (e.target.value.length > 0) setShowPasswordReqs(true);
                  }}
                  onFocus={() => formData.password.length > 0 && setShowPasswordReqs(true)}
                  placeholder="••••••••"
                  className="w-full h-16 px-6 bg-slate-900/50 border border-white/10 rounded-2xl text-white font-bold text-lg placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all hover:bg-slate-900/80 shadow-inner"
                />
                {/* Password Requirements */}
                {showPasswordReqs && (
                  <div className="bg-slate-900/30 border border-white/5 rounded-xl p-3 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Password Requirements</p>
                    {passwordReqs.map((req, idx) => {
                      const isMet = req.test(formData.password);
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isMet ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-500'}`}>
                            {isMet ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            )}
                          </div>
                          <span className={`text-xs ${isMet ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                            {req.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

                                    {/* Confirm Password */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1 ml-1 flex items-center gap-2">
                                            <CheckCircle className="w-3 h-3 text-amber-500" />
                                            Confirm Password
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full h-16 px-6 bg-slate-900/50 border border-white/10 rounded-2xl text-white font-bold text-lg placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all hover:bg-slate-900/80 shadow-inner"
                                        />
                                    </div>
                                </div>

                                {/* Error Alert */}
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                                        <p className="text-sm text-red-200 font-bold">{error}</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-20 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-900 font-black text-sm uppercase tracking-[0.25em] rounded-[1.5rem] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 shadow-[0_20px_40px_-15px_rgba(245,158,11,0.3)] mt-6 ring-4 ring-amber-500/10"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                            Creating Account...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="h-6 w-6" />
                                            Start your Journey
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Login Redirect */}
                            {onShowLogin && (
                                <div className="mt-8 pt-8 border-t border-white/5 text-center">
                                    <p className="text-sm text-slate-500 font-medium mb-4">Already have an account?</p>
                                    <button
                                        onClick={onShowLogin}
                                        className="inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 font-black text-xs uppercase tracking-widest transition-colors"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        Switch to Login
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Info */}
                <div className="mt-10 text-center animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-500">
                    <p className="text-[11px] text-slate-600 font-black uppercase tracking-[0.4em] mb-4">
                        Jinda v1.0.0 — Ecosystem Active
                    </p>
                    <div className="flex items-center justify-center gap-6">
                        <div className="h-px w-12 bg-slate-800" />
                        <div className="h-2 w-2 bg-red-600 rotate-45" />
                        <div className="h-px w-12 bg-slate-800" />
                    </div>
                </div>
            </div>
        </div>
    );
}
