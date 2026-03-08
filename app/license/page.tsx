'use client'

import { Key, Laptop, LifeBuoy, RefreshCcw, UserPlus, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function LicensePage() {
    const sections = [
        {
            icon: Key,
            title: 'License Grant',
            content: 'Subject to these terms, Dhisum Tseyig grants you a non-exclusive, non-transferable, limited license to use the software according to your purchased plan.',
        },
        {
            icon: UserPlus,
            title: 'User Account Limits',
            content: 'Your license is strictly limited by the number of user accounts in your plan: Starter (1 User), Growth (2 Users), or Enterprise (5 Users). Exceeding these limits requires a plan upgrade.',
        },
        {
            icon: Laptop,
            title: 'Installation & Activation',
            content: 'Each license key is bound to a specific hardware ID. Re-installation or moving the software to a new device may require a license reset from our support team.',
        },
        {
            icon: Zap,
            title: 'Free Trial Usage',
            content: 'The 7-day free trial is intended for evaluation purposes only. All premium features are enabled during this period. At the end of 7 days, the software will require a valid license key to continue operation.',
        },
        {
            icon: RefreshCcw,
            title: 'Term & Renewal',
            content: 'Paid licenses are valid for the duration of the purchased term (1, 2, or 3 years). Renewal must be completed before the expiry date to avoid service interruption.',
        },
        {
            icon: LifeBuoy,
            title: 'Support & Updates',
            content: 'All active licenses include unlimited software updates and priority technical support. Support is provided via email, phone, or remote assistance during standard business hours.',
        },
    ]

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Hero Header */}
            <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-bhutan-maroon-dark py-20 text-white relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-bhutan-gold/5 blur-[150px] rounded-full pointer-events-none" />
                <div className="container relative z-10 px-4 md:px-6">
                    <div className="max-w-3xl mx-auto text-center space-y-4">
                        <Badge className="bg-bhutan-gold text-bhutan-maroon-dark border-none px-4 py-1.5 rounded-full font-black tracking-widest uppercase text-[10px]">End User License</Badge>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">License Agreement</h1>
                        <p className="text-sm md:text-lg text-white/60 font-medium leading-relaxed">
                            Transparent rules for activation, seat limits, and software ownership. Read our EULA to understand how your license works.
                        </p>
                    </div>
                </div>
            </section>

            {/* Content Grid */}
            <section className="py-16 md:py-24">
                <div className="container px-4 md:px-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            {sections.map((section, i) => (
                                <Card key={i} className="group border-slate-100 hover:shadow-2xl hover:shadow-bhutan-maroon/5 transition-all duration-500 rounded-[2rem] overflow-hidden">
                                    <CardContent className="p-8 space-y-4">
                                        <div className="h-12 w-12 rounded-2xl bg-bhutan-maroon/10 text-bhutan-maroon flex items-center justify-center group-hover:bg-bhutan-maroon group-hover:text-white transition-all duration-500">
                                            <section.icon className="h-6 w-6" />
                                        </div>
                                        <h3 className="text-lg font-black tracking-tight text-slate-900">{section.title}</h3>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                            {section.content}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="mt-16 p-8 md:p-12 bg-white rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Anti-Piracy & Compliance</h2>
                            <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                                <p>
                                    Any attempt to bypass activation, redistribute the software without authorization, or modify the core application will result in immediate license termination without refund.
                                </p>
                                <div className="pt-8 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Updated: March 2026
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
