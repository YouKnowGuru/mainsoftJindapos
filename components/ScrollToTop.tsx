'use client'

import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false)

    // Show button when page is scrolled down
    const toggleVisibility = () => {
        if (window.scrollY > 300) {
            setIsVisible(true)
        } else {
            setIsVisible(false)
        }
    }

    // Set the scroll to top function
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        })
    }

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility)
        return () => window.removeEventListener('scroll', toggleVisibility)
    }, [])

    return (
        <div className={cn(
            "fixed bottom-8 right-8 z-50 transition-all duration-500 transform",
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
        )}>
            <Button
                size="icon"
                onClick={scrollToTop}
                className="h-12 w-12 rounded-2xl bg-bhutan-gold text-bhutan-maroon-dark shadow-[0_20px_50px_rgba(255,215,0,0.3)] hover:bg-white hover:scale-110 active:scale-95 transition-all border border-white/20 shadow-xl group"
                aria-label="Scroll to Top"
            >
                <ArrowUp className="h-6 w-6 group-hover:-translate-y-1 transition-transform duration-300" />
            </Button>
        </div>
    )
}
