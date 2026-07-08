import { Zap, ShieldCheck, ArrowRight } from 'lucide-react';

interface TrialBannerProps {
    daysRemaining: number;
    onActivate: () => void;
}

/**
 * TrialBanner - Premium notice shown when app is in trial mode.
 */
export function TrialBanner({ daysRemaining, onActivate }: TrialBannerProps) {
    return (
        <div className="bg-gradient-to-r from-bhutan-maroon to-red-900 text-white px-6 py-2.5 relative overflow-hidden shadow-lg border-b border-white/10 group">
            {/* Animated Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent animate-pulse pointer-events-none" />

            <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="h-8 w-8 bg-amber-400 rounded-lg flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform">
                        <Zap className="h-5 w-5 text-bhutan-maroon" />
                    </div>
                    <div>
                        <p className="text-sm font-black tracking-tight flex items-center gap-2">
                            TRIAL MODE ACTIVE
                            <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                        </p>
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em]">
                            You have <span className="text-amber-400">{daysRemaining} days</span> remaining to explore and set up your systems.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 border-r border-white/10 pr-6">
                        <ShieldCheck className="w-3 h-3" />
                        Full Access Unlocked
                    </div>
                    <button
                        onClick={onActivate}
                        className="bg-white text-bhutan-maroon px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95"
                    >
                        Activate Permanent License
                        <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Sublte Decorative Elements */}
            <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-[0.05] pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-16 h-16 fill-current text-white">
                    <path d="M50 5L35 20L50 35L65 20L50 5ZM20 35L5 50L20 65L35 50L20 35ZM80 35L65 50L80 65L95 50L80 35ZM50 65L35 80L50 95L65 80L50 65ZM50 35L35 50L50 65L65 50L50 35Z" />
                </svg>
            </div>
        </div>
    );
}
