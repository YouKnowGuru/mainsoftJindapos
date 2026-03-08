import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

const plans = [
  {
    name: 'Free Trial',
    price: '0',
    period: '7 days',
    description: 'Experience the full power of Dhisum Tseyig.',
    features: [
      'All 9 Premium Modules',
      'Unlimited Products',
      'Full GST Compliance',
      'Offline-First Access',
      'Data Backup Support',
      '1 User Account',
    ],
    cta: 'Start Free Trial',
    href: '/download',
  },
  {
    name: 'Starter (1-Year)',
    price: '9,999',
    period: 'first year',
    renewal: 'Nu. 6,999',
    description: 'Perfect for established single-user shops.',
    features: [
      '1 Licensed User Account',
      'Unlimited POS Terminals',
      'Full Accounting Suite',
      'Priority Email Support',
      'All Premium Features',
      'Lifetime Data Ownership',
    ],
    cta: 'Get Started',
    href: '/contact',
  },
  {
    name: 'Growth (2-Year)',
    price: '14,999',
    period: 'first purchase',
    renewal: 'Nu. 2,999',
    description: 'Best for growing businesses with staff.',
    features: [
      '2 Licensed User Accounts',
      'Unlimited POS Terminals',
      'Advanced Inventory Hub',
      'Priority Phone Support',
      'All Premium Features',
      'Free Remote Setup',
    ],
    cta: 'Select Growth',
    href: '/contact',
    popular: true,
  },
  {
    name: 'Enterprise (3-Year)',
    price: '19,999',
    period: 'first purchase',
    renewal: 'Nu. 999',
    description: 'The Ultimate long-term value for scaling.',
    features: [
      '5 Licensed User Accounts',
      'Unlimited POS Terminals',
      'Enterprise Analytics',
      '24/7 Priority Support',
      'All Premium Features',
      'Personal Account Manager',
    ],
    cta: 'Go Enterprise',
    href: '/contact',
    bestValue: true,
  },
]

const faqs = [
  {
    question: 'Does Dhisum Tseyig work without internet?',
    answer: 'Yes! Dhisum Tseyig is an offline-first desktop application. All your data is stored locally using SQLite. You don\'t need internet for daily operations like sales, inventory management, or printing invoices.',
  },
  {
    question: 'Is GST automatically calculated?',
    answer: 'Yes. The software automatically applies 5% GST on all taxable transactions as per Bhutanese regulation (Jan 2026). You can also generate monthly GSTR reports for filing.',
  },
  {
    question: 'What payment methods are supported?',
    answer: 'The POS supports all major Bhutanese payment methods: mBOB, BNB, TPay, DrukPNB, BDBL, DKBank, plus cash, bank transfer, card, and credit payments.',
  },
  {
    question: 'Can I switch plans later?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Your data is always preserved when switching plans.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes, all plans come with a 7-day free trial. No credit card required. Download and start using immediately.',
  },
  {
    question: 'Can I back up my data?',
    answer: 'Yes. Dhisum Tseyig includes automatic backup scheduling and manual backup/restore functionality. You can back up your entire database with one click.',
  },
]

export const metadata = {
  title: 'Pricing - Dhisum Tseyig',
  description: 'Choose the perfect plan for your Bhutanese business. All plans include GST compliance and offline functionality.',
}

export default function PricingPage() {
  return (
    <div className="flex flex-col">
      <section className="bg-gradient-to-br from-bhutan-maroon-dark to-bhutan-maroon py-10 md:py-14 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-bhutan-gold opacity-5 blur-[80px] md:blur-[120px] rounded-full" />
        <div className="container relative z-10 px-4 md:px-6">
          <div className="text-center max-w-xl mx-auto">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black mb-3 tracking-tight leading-tight">Simple, Transparent Pricing</h1>
            <p className="text-xs md:text-sm text-white/70 font-medium leading-relaxed">
              Choose the plan that works best for your business. All plans include GST compliance.
            </p>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <Card key={plan.name} className={cn(
                "rounded-2xl md:rounded-[2rem] transition-all duration-300",
                plan.popular ? 'border-bhutan-maroon shadow-lg shadow-bhutan-maroon/10 md:scale-105 z-10' :
                  plan.bestValue ? 'border-bhutan-gold shadow-lg shadow-bhutan-gold/10 md:scale-105 z-10 bg-slate-900 border-2' :
                    'border-slate-100 hover:shadow-lg'
              )}>
                {plan.popular && (
                  <div className="bg-bhutan-maroon text-bhutan-gold text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-center py-2 rounded-t-2xl md:rounded-t-[2rem]">
                    Most Popular
                  </div>
                )}
                {plan.bestValue && (
                  <div className="bg-bhutan-gold text-bhutan-maroon text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-center py-2 rounded-t-2xl md:rounded-t-[2rem]">
                    Best Value
                  </div>
                )}
                <CardContent className="p-4 md:p-6 flex flex-col h-full">
                  <div className="mb-4">
                    <h3 className={cn("text-base md:text-lg font-black mb-1 tracking-tight", plan.bestValue && "text-white")}>{plan.name}</h3>
                    <p className={cn("text-[10px] md:text-xs font-bold opacity-70 leading-relaxed", plan.bestValue ? "text-slate-300" : "text-muted-foreground")}>{plan.description}</p>
                  </div>
                  <div className="mb-5">
                    <span className={cn("text-xl md:text-2xl font-black tracking-tighter", plan.bestValue ? "text-white" : "text-slate-900")}>Nu {plan.price}</span>
                    <span className="text-[9px] md:text-[10px] text-slate-400 font-bold ml-1.5 uppercase tracking-widest">{plan.period}</span>
                    {plan.renewal && (
                      <p className={cn("text-[10px] font-black mt-1 uppercase tracking-tight", plan.bestValue ? "text-bhutan-gold" : "text-bhutan-maroon")}>
                        Renewal: {plan.renewal}
                      </p>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-[10px] md:text-xs font-bold text-slate-600">
                        <Check className="h-3.5 w-3.5 text-bhutan-maroon mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.href}>
                    <Button
                      className={cn(
                        "w-full h-10 md:h-11 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-md transition-transform hover:scale-[1.02]",
                        plan.popular ? 'bg-bhutan-maroon hover:bg-bhutan-maroon-dark text-white shadow-bhutan-maroon/20' :
                          plan.bestValue ? 'bg-bhutan-gold hover:bg-white text-bhutan-maroon-dark shadow-bhutan-gold/40' :
                            'border-slate-200 text-slate-800 hover:bg-slate-50'
                      )}
                      variant={plan.popular || plan.bestValue ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-slate-50">
        <div className="container px-4 md:px-6 max-w-2xl">
          <h2 className="text-lg sm:text-xl md:text-2xl font-black mb-6 md:mb-8 text-center tracking-tight text-slate-900">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-2 md:space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="bg-white border border-slate-100 rounded-xl md:rounded-2xl px-4 md:px-6 py-0.5">
                <AccordionTrigger className="text-left font-black text-xs md:text-sm text-slate-700 hover:text-bhutan-maroon hover:no-underline">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-slate-500 font-medium leading-relaxed text-[10px] md:text-xs pt-1 pb-4">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  )
}
