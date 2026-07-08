import { useEffect, useState } from 'react';
import { Zap, ArrowRight, Shield, LogIn, Sparkles } from 'lucide-react';
import { Logo } from '../components/Logo';

interface WelcomePageProps {
    onTrialStarted: () => void;
    onShowActivation: () => void;
    hasAdminUser?: boolean;
    onShowLogin?: () => void;
}

/**
 * WelcomePage - The first screen a new user sees.
 * Fully responsive design with Bhutanese-inspired premium aesthetics + rich entrance animations.
 */
export function WelcomePage({ onTrialStarted, onShowActivation, hasAdminUser, onShowLogin }: WelcomePageProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#020617] relative overflow-hidden font-sans">
            {/* --- Animated Background Layer --- */}
            
            {/* Subtle Noise Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            {/* Animated Bhutanese-themed Glowing Orbs - Responsive sizes */}
            <div 
                className={`absolute top-[15%] -left-[20%] sm:-left-[10%] w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[600px] lg:h-[600px] bg-red-800/20 blur-[100px] lg:blur-[150px] rounded-full pointer-events-none transition-all duration-[2000ms] ease-out ${
                    mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                }`}
            />
            <div 
                className={`absolute bottom-[15%] -right-[20%] sm:-right-[10%] w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] lg:w-[500px] lg:h-[500px] bg-bhutan-orange/10 blur-[80px] lg:blur-[130px] rounded-full pointer-events-none transition-all duration-[2000ms] ease-out delay-500 ${
                    mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                }`}
            />
            
            {/* Floating particles - Hidden on small mobile */}
            <div className="hidden sm:block absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className={`absolute w-1 h-1 bg-amber-400/30 rounded-full transition-all duration-1000 ${
                            mounted ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{
                            left: `${15 + i * 15}%`,
                            top: `${20 + (i % 3) * 25}%`,
                            animation: mounted ? `float ${6 + i}s ease-in-out infinite` : 'none',
                            animationDelay: `${i * 0.8}s`,
                        }}
                    />
                ))}
            </div>

            {/* Animated gradient ring - Hidden on mobile */}
            <div 
                className={`hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] lg:w-[800px] lg:h-[800px] rounded-full border border-white/[0.02] pointer-events-none transition-all duration-[2500ms] ease-out ${
                    mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                }`}
                style={{ animation: mounted ? 'slowSpin 60s linear infinite' : 'none' }}
            />
            <div 
                className={`hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] lg:w-[600px] lg:h-[600px] rounded-full border border-white/[0.03] pointer-events-none transition-all duration-[2500ms] ease-out delay-300 ${
                    mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                }`}
                style={{ animation: mounted ? 'slowSpin 45s linear infinite reverse' : 'none' }}
            />

            {/* Main Content Container */}
            <div className="relative z-10 w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-12 lg:py-0">
                
                {/* Header Section */}
                <div className={`text-center mb-8 sm:mb-12 lg:mb-16 flex flex-col items-center transition-all duration-1000 ease-out ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}>
                    
                    {/* Sparkle badge */}
                    <div 
                        className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/10 mb-4 sm:mb-6 lg:mb-8 transition-all duration-700 delay-300 ${
                            mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                        }`}
                    >
                        <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">
                            Welcome to Jinda
                        </span>
                    </div>

                    {/* Logo - Responsive sizing */}
                    <div 
                        className={`transition-all duration-700 delay-500 ${
                            mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                        }`}
                    >
                        <Logo size="lg" className="mb-4 sm:mb-6 lg:mb-8 sm:hidden" />
                        <Logo size="xl" className="mb-4 sm:mb-6 lg:mb-8 hidden sm:block lg:hidden" />
                        <Logo size="xl" className="mb-6 lg:mb-8 hidden lg:block" />
                    </div>
                    
                    {/* Title - Responsive font sizes */}
                    <h1 
                        className={`text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter italic lg:text-6xl mb-2 sm:mb-3 lg:mb-4 transition-all duration-700 delay-700 ${
                            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                    >
                        JINDA <span className="text-amber-400">POS</span>
                    </h1>
                    
                    {/* Animated divider */}
                    <div 
                        className={`h-1 bg-amber-500/50 rounded-full mb-4 sm:mb-5 lg:mb-6 transition-all duration-700 delay-900 ${
                            mounted ? 'w-12 sm:w-16 opacity-100' : 'w-0 opacity-0'
                        }`}
                    />
                    
                    {/* Subtitle */}
                    <p 
                        className={`text-slate-400 font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase text-[10px] sm:text-xs lg:text-sm transition-all duration-700 delay-1000 ${
                            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                    >
                        Accounting & POS Ecosystem
                    </p>
                </div>

                {/* Choice Cards - Responsive grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 xl:gap-12">
                    
                    {/* Trial Card */}
                    <div 
                        className={`group bg-white/5 backdrop-blur-3xl border border-white/10 rounded-2xl sm:rounded-[2rem] lg:rounded-[3rem] p-6 sm:p-8 lg:p-10 xl:p-14 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-700 flex flex-col items-center text-center shadow-2xl relative overflow-hidden ${
                            mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
                        }`}
                        style={{ transitionDelay: mounted ? '1200ms' : '0ms' }}
                    >
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 bg-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl sm:rounded-[2rem] lg:rounded-[3rem]" />
                        
                        {/* Icon - Responsive sizing */}
                        <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 bg-amber-400/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-5 sm:mb-6 lg:mb-8 border border-amber-400/20 group-hover:scale-110 transition-transform duration-500 relative">
                            <Zap className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-amber-400" />
                        </div>
                        
                        {/* Card Title */}
                        <h2 className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-3 lg:mb-4 tracking-tight relative">
                            Evaluate first?
                        </h2>
                        
                        {/* Card Description */}
                        <p className="text-slate-400 font-medium mb-6 sm:mb-8 lg:mb-10 leading-relaxed text-xs sm:text-sm relative">
                            Experience the full power of Jinda for <span className="text-white font-bold">7 days</span>.
                            No credit card or license required to start.
                        </p>
                        
                        {/* Button - Responsive padding and text */}
                        <button
                            onClick={onTrialStarted}
                            className="w-full py-4 sm:py-5 lg:py-6 bg-white text-slate-950 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[9px] sm:text-[10px] hover:bg-amber-400 transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 shadow-2xl hover:scale-[1.02] active:scale-[0.98] group/btn relative overflow-hidden"
                        >
                            <span className="relative z-10">Get Started for Free</span>
                            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 relative z-10 group-hover/btn:translate-x-1 transition-transform duration-300" />
                        </button>
                    </div>

                    {/* Activate Card */}
                    <div 
                        className={`group bg-white/5 backdrop-blur-3xl border border-white/10 rounded-2xl sm:rounded-[2rem] lg:rounded-[3rem] p-6 sm:p-8 lg:p-10 xl:p-14 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-700 flex flex-col items-center text-center shadow-2xl relative overflow-hidden ${
                            mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
                        }`}
                        style={{ transitionDelay: mounted ? '1400ms' : '0ms' }}
                    >
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl sm:rounded-[2rem] lg:rounded-[3rem]" />
                        
                        {/* Icon - Responsive sizing */}
                        <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 bg-red-600/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-5 sm:mb-6 lg:mb-8 border border-red-600/20 group-hover:scale-110 transition-transform duration-500 relative">
                            <Shield className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-red-500" />
                        </div>
                        
                        {/* Card Title */}
                        <h2 className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-3 lg:mb-4 tracking-tight relative">
                            Already Licensed?
                        </h2>
                        
                        {/* Card Description */}
                        <p className="text-slate-400 font-medium mb-6 sm:mb-8 lg:mb-10 leading-relaxed text-xs sm:text-sm relative">
                            Activate your permanent license key to unlock lifetime access
                            and Bhutanese-centric business tools.
                        </p>
                        
                        {/* Button - Responsive padding and text */}
                        <button
                            onClick={onShowActivation}
                            className="w-full py-4 sm:py-5 lg:py-6 bg-slate-900 border border-white/10 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[9px] sm:text-[10px] hover:bg-white hover:text-slate-950 transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 shadow-2xl hover:scale-[1.02] active:scale-[0.98] group/btn relative overflow-hidden"
                        >
                            <span className="relative z-10">Enter License Key</span>
                            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 relative z-10 group-hover/btn:translate-x-1 transition-transform duration-300" />
                        </button>
                    </div>
                </div>

                {/* Optional Login Link */}
                {hasAdminUser && onShowLogin && (
                    <div 
                        className={`mt-8 sm:mt-10 lg:mt-12 text-center transition-all duration-700 ${
                            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                        style={{ transitionDelay: mounted ? '1600ms' : '0ms' }}
                    >
                        <p className="text-slate-500 font-bold mb-3 sm:mb-4 text-[10px] sm:text-xs tracking-wide">
                            Looking for your dashboard?
                        </p>
                        <button
                            onClick={onShowLogin}
                            className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] transition-all hover:scale-[1.02]"
                        >
                            <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                            Sign in to Existing Account
                        </button>
                    </div>
                )}

                {/* Version Tag */}
                <div 
                    className={`mt-10 sm:mt-12 lg:mt-16 text-center transition-all duration-700 ${
                        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                    style={{ transitionDelay: mounted ? '1800ms' : '0ms' }}
                >
                    <p className="text-[8px] sm:text-[10px] text-slate-700 font-black uppercase tracking-[0.4em] sm:tracking-[0.5em] mb-3 sm:mb-4">
                        Jinda v1.0.0 — Himalayan Tech
                    </p>
                    <div className="flex items-center justify-center gap-3 sm:gap-4">
                        <div className="h-px w-8 sm:w-12 bg-slate-900" />
                        <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-red-950 rotate-45 border border-white/5" />
                        <div className="h-px w-8 sm:w-12 bg-slate-900" />
                    </div>
                </div>
            </div>

            {/* CSS Keyframes for animations */}
            <style>{`
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px) scale(1);
                        opacity: 0.3;
                    }
                    50% {
                        transform: translateY(-30px) scale(1.5);
                        opacity: 0.8;
                    }
                }
                @keyframes slowSpin {
                    from {
                        transform: translate(-50%, -50%) rotate(0deg);
                    }
                    to {
                        transform: translate(-50%, -50%) rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
}
