import React from 'react';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
    className?: string;
    animate?: boolean;
}

/**
 * Reusable Logo Component
 * Features circular design, custom border, and premium animations
 */
export const Logo: React.FC<LogoProps> = ({
    size = 'md',
    className = '',
    animate = true
}) => {
    // Map size keys to dimensions
    const sizeMap = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24',
        '2xl': 'w-32 h-32'
    };

    const sizeClass = typeof size === 'string' ? sizeMap[size] || sizeMap.md : '';
    const style = typeof size === 'number' ? { width: size, height: size } : {};

    return (
        <div
            className={`relative inline-block ${sizeClass} ${className} group`}
            style={style}
        >
            {/* Outer Glow/Ring */}
            <div className={`absolute -inset-1 bg-gradient-to-tr from-bhutan-gold/40 to-transparent rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${animate ? 'animate-pulse' : ''}`}></div>

            {/* Main Logo Container */}
            <div className={`relative h-full w-full rounded-full border-2 border-white/20 overflow-hidden bg-white/5 backdrop-blur-sm shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:border-bhutan-gold/50 group-hover:rotate-3 ${animate ? 'animate-[float_6s_ease-in-out_infinite]' : ''}`}>
                <img
                    src="./images/logo.png"
                    alt="Jinda Logo"
                    className="h-full w-full object-cover scale-110" // scale up slightly to ensure circle is filled
                />

                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </div>
        </div>
    );
};
