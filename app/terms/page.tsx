'use client'

import { FileCheck, Activity, Users, AlertCircle, Ban, Scale } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function TermsPage() {
    const sections = [
        {
            icon: FileCheck,
            title: 'Agreement to Terms',
            content: 'By accessing or using Dhisum Tseyig, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.',
        },
        {
            icon: Users,
            title: 'User Accounts',
            content: 'You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.',
        },
        {
            icon: Activity,
            title: 'Service Availability',
            content: 'We strive to provide continuous service. However, Dhisum Tseyig is provided "AS IS" and "AS AVAILABLE". We do not guarantee that the service will be uninterrupted or error-free.',
        },
        {
            icon: Ban,
            title: 'Prohibited Uses',
            content: 'You may not use the platform for any illegal activities or to infringe upon the intellectual property rights of others. This includes unauthorized distribution, reverse engineering, or "cracking" of the software.',
        },
        {
            icon: Scale,
            title: 'Liability Limitation',
            content: 'In no event shall Dhisum Tseyig, nor its directors, employees, or partners, be liable for any indirect, incidental, special, or consequential damages resulting from your use of the service.',
        },
        {
            icon: AlertCircle,
            title: 'Governing Law',
            content: 'These Terms shall be governed and construed in accordance with the laws of the Kingdom of Bhutan, without regard to its conflict of law provisions.',
        },
    ]

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Hero Header */}
            <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-bhutan-maroon-dark py-20 text-white relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-bhutan-gold/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="container relative z-10 px-4 md:px-6">
                    <div className="max-w-3xl mx-auto text-center space-y-4">
                        <Badge className="bg-bhutan-gold text-bhutan-maroon-dark border-none px-4 py-1.5 rounded-full font-black tracking-widest uppercase text-[10px]">Service Terms</Badge>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Terms of Service</h1>
                        <p className="text-sm md:text-lg text-white/60 font-medium leading-relaxed">
                            Understand your rights and responsibilities. Our terms are designed to protect both the user and the platform.
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
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Acceptance of Terms</h2>
                            <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                                <p>
                                    We reserve the right to modify these terms at any time. Your continued use of the platform after changes are posted constitutes your acceptance of the new terms.
                                </p>
                                <div className="pt-8 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Effective Date: March 2026
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
