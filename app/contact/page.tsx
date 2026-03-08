'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Mail,
  MapPin,
  Phone,
  Send,
  Loader2,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      subject: formData.get('subject'),
      message: formData.get('message'),
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setIsSuccess(true)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to send message. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again later.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section - Matching Home Page styling */}
      <section className="relative overflow-hidden bg-gradient-to-br from-bhutan-maroon-dark via-bhutan-maroon to-slate-900 text-white flex items-center py-16 md:py-24">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-bhutan-gold opacity-[0.03] blur-[120px] rounded-full" />
        <div className="container relative z-10 px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto stagger-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md w-fit mx-auto mb-6">
              <div className="h-1.5 w-1.5 rounded-full bg-bhutan-gold animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-bhutan-gold">Support & Inquiries</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-glow-gold">
              Contact Us
            </h1>
            <p className="text-base md:text-lg text-white/80 leading-relaxed font-medium">
              Have questions about Dhisum Tseyig? Need help with setup, licensing, or GST compliance? We're here for you.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content - Utilizing clear, bright bg-slate-50 / bg-white like Home Page */}
      <section className="py-16 md:py-24 bg-slate-50 relative overflow-hidden flex-1">
        <div className="container relative z-10 px-4 md:px-6">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 max-w-7xl mx-auto">

            {/* Contact Info Sidebar */}
            <div className="lg:col-span-4 space-y-4 md:space-y-6 stagger-in">
              {/* Visit Us */}
              <Card className="border-none shadow-sm hover:shadow-xl hover:shadow-bhutan-maroon/5 group transition-all duration-300 rounded-[2rem] overflow-hidden">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-start gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-bhutan-maroon/10 to-transparent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                      <MapPin className="h-6 w-6 text-bhutan-maroon" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 tracking-tight mb-2 group-hover:text-bhutan-maroon transition-colors">Visit Us</h3>
                      <p className="text-sm font-medium text-slate-500 leading-relaxed">
                        Damphu, Our Store
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Call Us */}
              <Card className="border-none shadow-sm hover:shadow-xl hover:shadow-bhutan-maroon/5 group transition-all duration-300 rounded-[2rem] overflow-hidden">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-start gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-bhutan-maroon/10 to-transparent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                      <Phone className="h-6 w-6 text-bhutan-maroon" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 tracking-tight mb-2 group-hover:text-bhutan-maroon transition-colors">Call Us</h3>
                      <p className="text-sm font-medium text-slate-500 leading-relaxed">
                        +975 17699032<br />Mon - Fri, 9am - 5pm GST
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email Us */}
              <Card className="border-none shadow-sm hover:shadow-xl hover:shadow-bhutan-maroon/5 group transition-all duration-300 rounded-[2rem] overflow-hidden">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-start gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-bhutan-maroon/10 to-transparent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                      <Mail className="h-6 w-6 text-bhutan-maroon" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 tracking-tight mb-2 group-hover:text-bhutan-maroon transition-colors">Email Us</h3>
                      <p className="text-sm font-medium text-slate-500 leading-relaxed hidden sm:block">
                        dhisumtseyig@gmail.com
                      </p>
                      <p className="text-sm font-medium text-slate-500 leading-relaxed block sm:hidden break-words">
                        dhisumtseyig@gmail.com
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Response Time */}
              <Card className="border-none shadow-sm hover:shadow-xl hover:shadow-bhutan-maroon/5 group transition-all duration-300 rounded-[2rem] overflow-hidden hidden lg:block">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-start gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-bhutan-gold/20 to-transparent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                      <Clock className="h-6 w-6 text-bhutan-gold" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 tracking-tight mb-2 group-hover:text-bhutan-maroon transition-colors">Response Time</h3>
                      <p className="text-sm font-medium text-slate-500 leading-relaxed">
                        We typically respond within<br />24 hours on business days
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form Section */}
            <div className="lg:col-span-8 stagger-in">
              <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white/70 backdrop-blur-xl group">
                {/* Decorative Accent */}
                <div className="h-2 w-full bg-gradient-to-r from-bhutan-maroon via-bhutan-orange to-bhutan-gold" />

                <CardContent className="p-6 sm:p-10 lg:p-12 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full blur-3xl mix-blend-multiply opacity-50" />

                  {isSuccess ? (
                    <div className="text-center py-16 px-4 animate-in fade-in zoom-in duration-500 flex flex-col items-center justify-center relative z-10">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-bhutan-gold/20 rounded-full blur-xl animate-pulse" />
                        <div className="relative h-24 w-24 rounded-[2rem] bg-gradient-to-tr from-bhutan-maroon to-bhutan-gold flex items-center justify-center p-[2px] shadow-xl">
                          <div className="h-full w-full bg-white rounded-[1.8rem] flex items-center justify-center">
                            <CheckCircle className="h-12 w-12 text-bhutan-maroon" />
                          </div>
                        </div>
                      </div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Message Sent!</h3>
                      <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">
                        Thank you for reaching out. We'll get back to you as soon as possible.
                      </p>
                      <Button
                        onClick={() => setIsSuccess(false)}
                        variant="outline"
                        className="mt-8 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-bhutan-maroon transition-colors font-bold rounded-xl px-8"
                      >
                        Send another message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="relative z-10 space-y-6 md:space-y-8">
                      <div>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">Send us a Message</h2>
                        <p className="text-slate-500 font-medium">Fill out the form below and we'll be in touch quickly.</p>
                      </div>

                      {error && (
                        <Alert variant="destructive" className="bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                        <div className="space-y-2 group/input">
                          <Label htmlFor="name" className="text-sm font-bold text-slate-500 uppercase tracking-widest group-focus-within/input:text-bhutan-maroon transition-colors">Your Name</Label>
                          <Input
                            id="name"
                            name="name"
                            placeholder="Tshering Dorji"
                            required
                            className="bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-bhutan-maroon/20 focus-visible:border-bhutan-maroon rounded-xl h-12 px-4 transition-all font-medium shadow-sm"
                          />
                        </div>
                        <div className="space-y-2 group/input">
                          <Label htmlFor="email" className="text-sm font-bold text-slate-500 uppercase tracking-widest group-focus-within/input:text-bhutan-maroon transition-colors">Email Address</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="tshering@example.com"
                            required
                            className="bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-bhutan-maroon/20 focus-visible:border-bhutan-maroon rounded-xl h-12 px-4 transition-all font-medium shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 group/input">
                        <Label htmlFor="subject" className="text-sm font-bold text-slate-500 uppercase tracking-widest group-focus-within/input:text-bhutan-maroon transition-colors">Subject</Label>
                        <Input
                          id="subject"
                          name="subject"
                          placeholder="e.g., License activation, GST setup help, pricing inquiry"
                          required
                          className="bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-bhutan-maroon/20 focus-visible:border-bhutan-maroon rounded-xl h-12 px-4 transition-all font-medium shadow-sm"
                        />
                      </div>

                      <div className="space-y-2 group/input">
                        <Label htmlFor="message" className="text-sm font-bold text-slate-500 uppercase tracking-widest group-focus-within/input:text-bhutan-maroon transition-colors">Message</Label>
                        <Textarea
                          id="message"
                          name="message"
                          placeholder="Tell us more about your inquiry..."
                          rows={6}
                          required
                          className="bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-bhutan-maroon/20 focus-visible:border-bhutan-maroon rounded-xl px-4 py-3 transition-all font-medium shadow-sm resize-none"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-14 bg-gradient-to-r from-bhutan-maroon-dark to-bhutan-maroon text-white hover:shadow-xl hover:shadow-bhutan-maroon/20 font-black tracking-widest uppercase text-sm rounded-xl transition-all duration-300 group/btn relative overflow-hidden"
                      >
                        <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500 ease-out skew-x-12" />

                        {isSubmitting ? (
                          <span className="flex items-center gap-2 relative z-10">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Sending...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 relative z-10">
                            Send Message
                            <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
                          </span>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}
