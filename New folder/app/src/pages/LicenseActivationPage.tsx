import { useState } from 'react';
import { Key, AlertCircle, CheckCircle, Loader2, Zap, ArrowLeft, LogIn } from 'lucide-react';
import { Logo } from '../components/Logo';

/**
 * License Activation Page
 * Enhanced with back navigation, login diversion, and smarter error handling.
 * Premium dark design consistent with the Dhisum Tseyig brand.
 */
interface LicenseActivationPageProps {
    onActivated: () => void;
    onBack: () => void;
    onShowLogin: () => void;
    isTrialExpired?: boolean;
    licenseStatus?: string;
}

export function LicenseActivationPage({
    onActivated,
    onBack,
    onShowLogin,
    isTrialExpired,
    licenseStatus
}: LicenseActivationPageProps) {
    const [licenseKey, setLicenseKey] = useState('');
    const [isActivating, setIsActivating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [needsLogin, setNeedsLogin] = useState(false);

    const handleActivate = async () => {
        if (!licenseKey.trim()) {
            setError('Please enter your license key.');
            return;
        }

        // Basic format check
        if (licenseKey.length < 10) {
            setError('License key is too short. Please enter a valid key.');
            return;
        }

        setError(null);
        setIsActivating(true);

        try {
            // First activation or re-verification
            const result = await window.electronAPI.license.activate(licenseKey.trim());

            if (result.success) {
                // Check if this was a re-activation of an already bound device
                // Note: result.isFirstActivation comes from the backend through the service
                if (result.isFirstActivation === false) {
                    setSuccess(true);
                    setNeedsLogin(true);
                    // We don't call onActivated() immediately, we allow them to see the message
                } else {
                    setSuccess(true);
                    setTimeout(() => onActivated(), 1500);
                }
            } else {
                // Better error messaging based on backend response
                if (result.message.includes('another device')) {
                    setError('This license is already used on another computer. Contact support to transfer.');
                } else if (result.message.includes('expired')) {
                    setError('This license has expired. Please renew at dhisumtseyig.com.');
                } else if (result.message.includes('not found')) {
                    setError('Invalid license key. Please check for typos and try again.');
                } else {
                    setError(result.message);
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
                        DHISUM <span className="text-amber-400">TSEYIG</span>
                    </h1>
                    <div className="h-0.5 w-12 bg-amber-500/50 mt-2 mb-4 rounded-full" />
                    <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px]">
                        Secure License Activation
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 md:p-14 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative">

                    {/* Back Button (Only if not stuck here due to system requirements) */}
                    {licenseStatus === 'none' && !success && (
                        <button
                            onClick={onBack}
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
                                    <h3 className="text-2xl font-black text-white mb-2 italic">Device Already Licensed</h3>
                                    <p className="text-slate-400 font-medium mb-10">
                                        This computer is already linked to this license key. No setup required.
                                    </p>
                                    <button
                                        onClick={onShowLogin}
                                        className="w-full h-16 bg-white text-slate-900 font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 hover:bg-amber-400"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        Continue to Login
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-2xl font-black text-white mb-2 italic">Activation Successful</h3>
                                    <p className="text-slate-400 font-medium tracking-wide animate-pulse">
                                        Initializing your business environment...
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {/* Alert for trials or expired states */}
                            {isTrialExpired && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-6 flex items-start gap-4 animate-in slide-in-from-top-4 duration-500">
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
                                    onClick={() => window.electronAPI.shell.openExternal('https://dhisumtseyig.com/contact')}
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
                        Dhisum Tseyig v1.0.0 — Ecosystem Active
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
