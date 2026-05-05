import { Undo2, XCircle, CreditCard, RotateCcw, AlertTriangle, HelpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
    title: 'Refund Policy - Jinda',
    description: 'Refund and cancellation policy for Jinda POS software.',
}

export default function RefundPage() {
    const sections = [
        {
            icon: Undo2,
            title: 'Refund Eligibility',
            content: 'We offer a 7-day free trial so you can test the software before buying. If you purchase a license, refund requests must be made within 14 days of purchase.',
        },
        {
            icon: XCircle,
            title: 'Cancelling Renewal',
            content: 'You can cancel auto-renewal anytime. Your license will stay active until the end of your current paid term and will not renew automatically.',
        },
        {
            icon: CreditCard,
            title: 'How Refunds Work',
            content: 'Approved refunds are returned through the original payment method. It may take 5-10 business days for the amount to appear in your account.',
        },
        {
            icon: RotateCcw,
            title: 'Non-Refundable Items',
            content: 'Remote setup fees and installation services are non-refundable once completed. License keys that have been used extensively are also non-refundable.',
        },
        {
            icon: AlertTriangle,
            title: 'When Refunds Are Granted',
            content: 'Refunds are typically approved if the software does not work as described on your hardware and our support team cannot fix the issue.',
        },
        {
            icon: HelpCircle,
            title: 'How to Request a Refund',
            content: 'Email us at dhisumtseyig@gmail.com with your Order ID, License Key, and reason for the refund. We will review and respond within 3 business days.',
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
                            Fair and transparent refund rules. Try free for 7 days before you buy.
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
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Try Before You Buy</h2>
                            <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                                <p>
                                    We recommend using the 7-day free trial first. If you face any issues, contact our support team before requesting a refund. Most problems can be fixed quickly.
                                </p>
                                <div className="pt-8 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Updated: April 2026
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
