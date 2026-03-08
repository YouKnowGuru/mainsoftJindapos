import { useState } from 'react';
import { UserPlus, Shield, Loader2, CheckCircle, AlertCircle, User, Lock, UserCircle, ArrowLeft, LogIn } from 'lucide-react';

interface SetupAccountPageProps {
    onAccountCreated: (username: string, password: string) => void;
    onBack?: () => void;
    onShowLogin?: () => void;
}

/**
 * SetupAccountPage - Initial System Initialization
 * Now redesigned for maximum visual impact and simplicity.
 * Featuring a Bhutanese "Endless Knot" (Srivatsa) aesthetic.
 */
export function SetupAccountPage({ onAccountCreated, onBack, onShowLogin }: SetupAccountPageProps) {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        fullName: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Simple Validation
        if (!formData.username || !formData.password || !formData.fullName) {
            setError('Please fill in all fields.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await window.electronAPI.settings.createUser({
                username: formData.username,
                password: formData.password,
                fullName: formData.fullName,
                role: 'admin'
            });

            // FIX: Check for result.success instead of result.id
            if (result.success) {
                setIsSuccess(true);
                // Trigger auto-login and redirect
                setTimeout(() => {
                    onAccountCreated(formData.username, formData.password);
                }, 1500);
            } else {
                setError(result.message || 'Failed to create account.');
            }
        } catch (err: any) {
            setError('Database connection error. Please try again.');
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
                        Welcome to Dhisum Tseyig. Let's create your master administrator account to get started.
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
                            <h2 className="text-3xl font-black text-white mb-3">Setup Complete!</h2>
                            <p className="text-slate-400 font-medium text-lg">Redirecting to your dashboard...</p>
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
                                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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

                                    <div className="hidden md:block" />

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
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full h-16 px-6 bg-slate-900/50 border border-white/10 rounded-2xl text-white font-bold text-lg placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all hover:bg-slate-900/80 shadow-inner"
                                        />
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
                        Dhisum Tseyig v1.0.0 — Ecosystem Active
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
