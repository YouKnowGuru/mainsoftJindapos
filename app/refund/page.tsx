'use client'

import { Undo2, XCircle, CreditCard, RotateCcw, AlertTriangle, HelpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function RefundPage() {
    const sections = [
        {
            icon: Undo2,
            title: 'Return Eligibility',
            content: 'Since we provide a 7-day free trial with full access, we expect you to evaluate the software before purchase. Refund requests must be submitted within 14 days of the initial purchase date.',
        },
        {
            icon: XCircle,
            title: 'Cancellation Policy',
            content: 'You can cancel your subscription renewal at any time. Once cancelled, your license will remain active until the end of your current paid term (1, 2, or 3 years) and will not automatically renew.',
        },
        {
            icon: CreditCard,
            title: 'Processing Refunds',
            content: 'Approved refunds are processed via the original payment method. Depending on your bank, it may take 5–10 business days for the funds to appear in your account.',
        },
        {
            icon: RotateCcw,
            title: 'Non-Refundable Items',
            content: 'Initial setup fees and specialized remote installation services are non-refundable once the service has been performed. License keys that have been extensively used are also non-refundable.',
        },
        {
            icon: AlertTriangle,
            title: 'Condition for Refund',
            content: 'Refunds are typically granted if the software fails to function as advertised on supported hardware and our technical support team is unable to resolve the issue within a reasonable timeframe.',
        },
        {
            icon: HelpCircle,
            title: 'How to Request',
            content: 'To request a refund, please email our billing department at dhisumtseyig@gmail.com with your Order ID, License Key, and a detailed reason for the request.',
        },
    ]

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Hero Header */}
            <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-bhutan-maroon-dark py-20 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-bhutan-maroon/20 blur-[100px] rounded-full pointer-events-none" />
                <div className="container relative z-10 px-4 md:px-6">
                    <div className="max-w-3xl mx-auto text-center space-y-4">
                        <Badge className="bg-bhutan-gold text-bhutan-maroon-dark border-none px-4 py-1.5 rounded-full font-black tracking-widest uppercase text-[10px]">Return Policy</Badge>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Refund Policy</h1>
                        <p className="text-sm md:text-lg text-white/60 font-medium leading-relaxed">
                            Clear rules for returns, technical issues, and subscription cancellations. We value transparency and fairness in our billing.
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
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Technical Resolution First</h2>
                            <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                                <p>
                                    Before requesting a refund, we highly recommend contacting our support team. Most technical issues can be resolved remotely in minutes, and we are dedicated to ensuring your business stays operational.
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
