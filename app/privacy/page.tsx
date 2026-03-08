'use client'

import { Shield, Lock, Eye, FileText, Database, Bell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function PrivacyPage() {
    const sections = [
        {
            icon: Database,
            title: 'Data Collection & Storage',
            content: 'Dhisum Tseyig is an offline-first application. This means the vast majority of your business data (Sales, Inventory, Customer details) is stored locally on your device in an encrypted SQLite database. We do not have access to your daily business transactions.',
        },
        {
            icon: Shield,
            title: 'Information We Collect',
            content: 'We only collect minimal technical information required for license activation and system stability. This includes your Name, Email, Phone Number, and unique Hardware ID (UUID) to bind your license to your machine. We do not track your location or browsing habits.',
        },
        {
            icon: Lock,
            title: 'Security Measures',
            content: 'We implement enterprise-grade security for our cloud-based license management system. Your account credentials are encrypted using industry-standard protocols. Local data backups are optional and entirely managed by you; we recommend using external encrypted drives.',
        },
        {
            icon: Eye,
            title: 'Third-Party Disclosure',
            content: 'We never sell, trade, or otherwise transfer your personally identifiable information to outside parties. This does not include trusted third parties who assist us in operating our website or servicing you, so long as those parties agree to keep this information confidential.',
        },
        {
            icon: Bell,
            title: 'Policy Updates',
            content: 'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the bottom of this document.',
        },
        {
            icon: FileText,
            title: 'Your Rights',
            content: 'As a user in Bhutan, you have the right to access the personal information we hold about you. You can request that we correct, update, or delete your registration data at any time by contacting our support team.',
        },
    ]

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Hero Header */}
            <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-bhutan-maroon-dark py-20 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-bhutan-gold/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="container relative z-10 px-4 md:px-6">
                    <div className="max-w-3xl mx-auto text-center space-y-4">
                        <Badge className="bg-bhutan-gold text-bhutan-maroon-dark border-none px-4 py-1.5 rounded-full font-black tracking-widest uppercase text-[10px]">Security First</Badge>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Privacy Policy</h1>
                        <p className="text-sm md:text-lg text-white/60 font-medium leading-relaxed">
                            Your data belongs to you. We are committed to protecting your privacy and ensuring transparency in how we handle your information.
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
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Additional Information</h2>
                            <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                                <p>
                                    By using Dhisum Tseyig, you consent to our privacy policy. If we decide to change our privacy policy, we will post those changes on this page.
                                </p>
                                <p>
                                    Questions? Reach out to our data protection officer at <span className="text-bhutan-maroon font-black">dhisumtseyig@gmail.com</span>
                                </p>
                                <div className="pt-8 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Last Updated: March 2026
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
