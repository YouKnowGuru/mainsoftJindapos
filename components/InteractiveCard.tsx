'use client'

import React, { useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface InteractiveCardProps {
    children: React.ReactNode
    className?: string
    containerClassName?: string
    spotlightColor?: string
}

export const InteractiveCard = ({
    children,
    className,
    containerClassName,
    spotlightColor = 'rgba(128, 0, 0, 0.08)'
}: InteractiveCardProps) => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [isHovered, setIsHovered] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return
        const rect = cardRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setMousePos({ x, y })
    }

    const calculateTilt = () => {
        if (!isHovered || !cardRef.current) return 'rotateX(0deg) rotateY(0deg)'
        const rect = cardRef.current.getBoundingClientRect()
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const rotateX = ((mousePos.y - centerY) / centerY) * -10
        const rotateY = ((mousePos.x - centerX) / centerX) * 10
        return `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
    }

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn("perspective-1000 group relative h-full", containerClassName)}
        >
            <div
                style={{
                    transform: calculateTilt(),
                    transition: isHovered ? 'none' : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
                }}
                className={cn(
                    "transform-style-3d relative rounded-2xl md:rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden h-full",
                    className
                )}
            >
                {/* Spotlight Effect */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                        background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, ${spotlightColor}, transparent 80%)`,
                    }}
                />

                {/* Shine Overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />

                {/* Content */}
                <div className="relative z-10 h-full">
                    {children}
                </div>

                {/* Animated Border */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-bhutan-gold/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            </div>
        </div>
    )
}
