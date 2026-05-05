import { Shield, Lock, Eye, FileText, Database, Bell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
    title: 'Privacy Policy - Jinda',
    description: 'How Jinda handles your data. Your business data stays on your computer.',
}

export default function PrivacyPage() {
    const sections = [
        {
            icon: Database,
            title: 'Where Your Data Is Stored',
            content: 'Your business data — sales, inventory, customers — is stored on your own computer in a local SQLite database. We do not collect or store your daily business transactions on our servers.',
        },
        {
            icon: Shield,
            title: 'What Information We Collect',
            content: 'We only collect basic account information needed for license activation: your name, email, phone number, and a unique hardware ID from your computer. We do not track your location, browsing habits, or business activities.',
        },
        {
            icon: Lock,
            title: 'How We Protect Your Data',
            content: 'Account information is encrypted and stored securely. Your business data on your computer is under your control — we recommend regular backups to external drives or cloud storage.',
        },
        {
            icon: Eye,
            title: 'We Do Not Share Your Data',
            content: 'We never sell, trade, or share your personal information with third parties. The only exception is trusted service providers who help us operate the platform, and they are required to keep your information confidential.',
        },
        {
            icon: Bell,
            title: 'Changes to This Policy',
            content: 'We may update this policy from time to time. Any changes will be posted on this page with an updated date. We encourage you to review this page periodically.',
        },
        {
            icon: FileText,
            title: 'Your Rights',
            content: 'You can request to see, correct, or delete your personal account information at any time by emailing us at dhisumtseyig@gmail.com.',
        },
    ]

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Hero Header */}
            <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-bhutan-maroon-dark py-20 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-bhutan-gold/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="container relative z-10 px-4 md:px-6">
                    <div className="max-w-3xl mx-auto text-center space-y-4">
                        <Badge className="bg-bhutan-gold text-bhutan-maroon-dark border-none px-4 py-1.5 rounded-full font-black tracking-widest uppercase text-[10px]">Your Privacy Matters</Badge>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Privacy Policy</h1>
                        <p className="text-sm md:text-lg text-white/60 font-medium leading-relaxed">
                            Your business data belongs to you. Here is how we handle your information.
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
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Need More Information?</h2>
                            <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                                <p>
                                    By using Jinda, you agree to this privacy policy. If we make changes, we will update this page.
                                </p>
                                <p>
                                    Questions? Email us at <span className="text-bhutan-maroon font-black">dhisumtseyig@gmail.com</span>
                                </p>
                                <div className="pt-8 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Last Updated: April 2026
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
