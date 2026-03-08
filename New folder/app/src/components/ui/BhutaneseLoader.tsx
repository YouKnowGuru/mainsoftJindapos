

export function BhutaneseLoader({ size = 'md', text = 'Loading...' }: { size?: 'sm' | 'md' | 'lg', text?: string }) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-16 h-16',
        lg: 'w-24 h-24'
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`relative ${sizeClasses[size]}`}>
                {/* Outer rotating ring */}
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-bhutan-maroon border-r-bhutan-orange animate-[spin_3s_linear_infinite] opacity-80 shadow-[0_0_15px_rgba(114,31,41,0.3)]"></div>
                {/* Inner rotating ring (counter) */}
                <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-bhutan-orange border-l-bhutan-maroon animate-[spin_4s_linear_infinite_reverse] opacity-60"></div>
                {/* Center Endless Knot SVG (Srivatsa) */}
                <div className="absolute inset-0 flex items-center justify-center text-bhutan-maroon animate-pulse">
                    <svg className="w-1/2 h-1/2 drop-shadow-md" viewBox="0 0 100 100" fill="currentColor">
                        <path d="M50 10L65 25L50 40L35 25L50 10ZM50 40L65 55L50 70L35 55L50 40ZM50 70L65 85L50 100L35 85L50 70ZM20 40L35 55L20 70L5 55L20 40ZM80 40L95 55L80 70L65 55L80 40ZM50 25L65 40L80 25L65 10L50 25ZM50 55L65 70L80 55L65 40L50 55ZM50 25L35 40L20 25L35 10L50 25ZM50 55L35 70L20 55L35 40L50 55Z" />
                    </svg>
                </div>
            </div>
            {text && (
                <div className="text-sm font-medium tracking-widest uppercase text-bhutan-maroon/80 animate-pulse">
                    {text}
                </div>
            )}
        </div>
    );
}
