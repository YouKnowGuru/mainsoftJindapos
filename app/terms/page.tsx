import { FileCheck, Activity, Users, AlertCircle, Ban, Scale } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
    title: 'Terms of Service - Jinda',
    description: 'Terms and conditions for using Jinda POS software.',
}

export default function TermsPage() {
    const sections = [
        {
            icon: FileCheck,
            title: 'Using the Software',
            content: 'By using Jinda, you agree to these terms. If you do not agree, please do not use the software. You can contact us with any questions.',
        },
        {
            icon: Users,
            title: 'Your Account',
            content: 'Keep your login details safe. You are responsible for all activity under your account. If you suspect unauthorized access, contact us immediately.',
        },
        {
            icon: Activity,
            title: 'Service Availability',
            content: 'Jinda is a desktop application that runs on your computer. Since data is stored locally, service availability depends on your device health. We recommend regular backups.',
        },
        {
            icon: Ban,
            title: 'What You Cannot Do',
            content: 'You may not copy, modify, redistribute, reverse engineer, or attempt to crack the software. Do not use the software for any illegal activity.',
        },
        {
            icon: Scale,
            title: 'Limitation of Liability',
            content: 'Jinda is provided "as is." We do not guarantee the software will be error-free. We are not liable for any damages resulting from your use of the software.',
        },
        {
            icon: AlertCircle,
            title: 'Governing Law',
            content: 'These terms are governed by the laws of the Kingdom of Bhutan. Any disputes will be handled within Bhutanese jurisdiction.',
        },
    ]

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Hero Header */}
            <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-bhutan-maroon-dark py-20 text-white relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-bhutan-gold/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="container relative z-10 px-4 md:px-6">
                    <div className="max-w-3xl mx-auto text-center space-y-4">
                        <Badge className="bg-bhutan-gold text-bhutan-maroon-dark border-none px-4 py-1.5 rounded-full font-black tracking-widest uppercase text-[10px]">Terms of Use</Badge>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Terms of Service</h1>
                        <p className="text-sm md:text-lg text-white/60 font-medium leading-relaxed">
                            Simple rules for using Jinda. Designed to protect both you and the platform.
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
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Changes to These Terms</h2>
                            <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                                <p>
                                    We may update these terms from time to time. Continued use of the software after changes means you accept the new terms.
                                </p>
                                <div className="pt-8 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Effective Date: April 2026
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
