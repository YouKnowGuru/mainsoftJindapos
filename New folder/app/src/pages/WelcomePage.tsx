import { Zap, ArrowRight, Shield, LogIn } from 'lucide-react';
import { Logo } from '../components/Logo';

interface WelcomePageProps {
    onTrialStarted: () => void;
    onShowActivation: () => void;
    hasAdminUser?: boolean;
    onShowLogin?: () => void;
}

/**
 * WelcomePage - The first screen a new user sees.
 * Redesigned with Bhutanese-inspired premium aesthetics.
 * Simplifies the choice between Trial and Activation.
 */
export function WelcomePage({ onTrialStarted, onShowActivation, hasAdminUser, onShowLogin }: WelcomePageProps) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#020617] relative overflow-hidden font-sans">
            {/* --- Premium Background Layer --- */}
            {/* Subtle Noise Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            {/* Bhutanese-themed Glowing Orbs */}
            <div className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] bg-red-800/20 blur-[150px] rounded-full animate-pulse pointer-events-none" />
            <div className="absolute bottom-[20%] -right-[10%] w-[500px] h-[500px] bg-bhutan-orange/10 blur-[130px] rounded-full animate-pulse [animation-delay:2s] pointer-events-none" />

            <div className="relative z-10 w-full max-w-5xl px-6">
                {/* Header Section */}
                <div className="text-center mb-16 flex flex-col items-center">
                    <Logo size="xl" className="mb-8" />
                    <h1 className="text-5xl font-black text-white tracking-tighter italic lg:text-6xl mb-4">
                        DHISUM <span className="text-amber-400">TSEYIG</span>
                    </h1>
                    <div className="h-1 w-16 bg-amber-500/50 mx-auto mb-6 rounded-full" />
                    <p className="text-slate-400 font-bold tracking-[0.3em] uppercase text-xs lg:text-sm">
                        Accounting & POS Ecosystem
                    </p>
                </div>

                {/* Choice Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                    {/* Trial Card */}
                    <div className="group bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 lg:p-14 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-500 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
                        <div className="h-16 w-16 bg-amber-400/10 rounded-2xl flex items-center justify-center mb-8 border border-amber-400/20 group-hover:scale-110 transition-transform duration-500">
                            <Zap className="h-8 w-8 text-amber-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-4 tracking-tight">Evaluate first?</h2>
                        <p className="text-slate-400 font-medium mb-10 leading-relaxed text-sm">
                            Experience the full power of Dhisum Tseyig for <span className="text-white font-bold">7 days</span>.
                            No credit card or license required to start.
                        </p>
                        <button
                            onClick={onTrialStarted}
                            className="w-full py-6 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-amber-400 transition-all flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Get Started for Free
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Activate Card */}
                    <div className="group bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 lg:p-14 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-500 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
                        <div className="h-16 w-16 bg-red-600/10 rounded-2xl flex items-center justify-center mb-8 border border-red-600/20 group-hover:scale-110 transition-transform duration-500">
                            <Shield className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-4 tracking-tight">Already Licensed?</h2>
                        <p className="text-slate-400 font-medium mb-10 leading-relaxed text-sm">
                            Activate your permanent license key to unlock lifetime access
                            and Bhutanese-centric business tools.
                        </p>
                        <button
                            onClick={onShowActivation}
                            className="w-full py-6 bg-slate-900 border border-white/10 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white hover:text-slate-950 transition-all flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Enter License Key
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Optional Login Link */}
                {hasAdminUser && onShowLogin && (
                    <div className="mt-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <p className="text-slate-500 font-bold mb-4 text-xs tracking-wide">Looking for your dashboard?</p>
                        <button
                            onClick={onShowLogin}
                            className="inline-flex items-center gap-3 px-8 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all"
                        >
                            <LogIn className="w-4 h-4 text-amber-500" />
                            Sign in to Existing Account
                        </button>
                    </div>
                )}

                {/* Version Tag */}
                <div className="mt-16 text-center">
                    <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.5em] mb-4">
                        Dhisum Tseyig v1.0.0 — Himalayan Tech
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <div className="h-px w-12 bg-slate-900" />
                        <div className="h-2 w-2 bg-red-950 rotate-45 border border-white/5" />
                        <div className="h-px w-12 bg-slate-900" />
                    </div>
                </div>
            </div>
        </div>
    );
}
