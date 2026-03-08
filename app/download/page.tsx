'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, Monitor, FileArchive, Check, AlertCircle, Loader2, Shield } from 'lucide-react'
import { InteractiveCard } from '@/components/InteractiveCard'

const downloads = [
  {
    id: 'setup',
    title: 'Windows Installer',
    description: 'Recommended for most users. Full installation with all features including POS, accounting, and GST modules.',
    icon: Monitor,
    filename: 'Dhisum.Tseyig.Setup.1.0.0.exe',
    size: '~210 MB',
    requirements: [
      'Windows 10 or later',
      '4 GB RAM minimum',
      '200 MB free disk space',
      'No internet required after install',
    ],
  },
  {
    id: 'portable',
    title: 'Portable Version',
    description: 'Run directly from USB drive without installation. Perfect for trying on multiple machines.',
    icon: FileArchive,
    filename: 'Dhisum.Tseyig.1.0.0.exe',
    size: '~110 MB',
    requirements: [
      'Windows 10 or later',
      '4 GB RAM minimum',
      'Runs from USB drive',
    ],
  },
]

const highlights = [
  'Offline-first — no internet required',
  'All 9 modules included',
  '7-day free trial',
  'Automatic backup support',
]

export default function DownloadPage() {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async (type: string) => {
    setDownloading(type)
    setError(null)

    try {
      const response = await fetch(`/api/download?type=${type}`)
      const data = await response.json()

      if (data.success && data.downloadUrl) {
        const link = document.createElement('a')
        link.href = data.downloadUrl
        link.download = data.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        setError('Failed to get download link. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again later.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="flex flex-col">
      <section className="bg-gradient-to-br from-bhutan-maroon-dark to-bhutan-maroon py-10 md:py-14 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-bhutan-gold opacity-5 blur-[80px] md:blur-[120px] rounded-full" />
        <div className="container text-center relative z-10 px-4 md:px-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black mb-3 tracking-tight leading-tight">Download Dhisum Tseyig</h1>
          <p className="text-xs md:text-sm text-white/70 max-w-md mx-auto font-medium leading-relaxed">
            Get the latest version of our premium POS & accounting software.
          </p>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-5">
            {highlights.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 text-[9px] md:text-xs text-white/60 font-bold bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg backdrop-blur-sm">
                <Check className="h-3 w-3 text-bhutan-gold" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-white">
        <div className="container px-4 md:px-6">
          {error && (
            <Alert variant="destructive" className="mb-6 max-w-2xl mx-auto rounded-xl border-red-100 bg-red-50 text-red-900">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-bold text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
            {downloads.map((download) => (
              <InteractiveCard key={download.id} className="p-4 md:p-6 flex flex-col h-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-10 w-10 md:h-14 md:w-14 items-center justify-center rounded-xl md:rounded-2xl bg-bhutan-maroon/10 text-bhutan-maroon group-hover:bg-bhutan-maroon group-hover:text-bhutan-gold transition-all duration-300 transform-style-3d group-hover:scale-110 flex-shrink-0">
                    <download.icon className="h-5 w-5 md:h-7 md:w-7" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm md:text-base font-black tracking-tight mb-1 group-hover:text-bhutan-maroon transition-colors">{download.title}</h3>
                    <p className="text-[10px] md:text-xs text-muted-foreground font-medium leading-relaxed">{download.description}</p>
                  </div>
                </div>

                <div className="flex-1 mb-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Requirements</p>
                  <ul className="space-y-1.5">
                    {download.requirements.map((req) => (
                      <li key={req} className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-600">
                        <Check className="h-3 w-3 text-bhutan-maroon flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  size="lg"
                  className="w-full h-10 md:h-12 bg-bhutan-maroon hover:bg-bhutan-maroon-dark text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl shadow-md transition-all active:scale-95 z-20"
                  onClick={() => handleDownload(download.id)}
                  disabled={downloading === download.id}
                >
                  {downloading === download.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download {download.title}
                </Button>
              </InteractiveCard>
            ))}
          </div>

          {/* What's Included */}
          <div className="max-w-3xl mx-auto mt-10 md:mt-16">
            <div className="bg-slate-50 rounded-2xl p-5 md:p-8 border border-slate-100 relative overflow-hidden">
              <h3 className="text-sm md:text-base font-black mb-4 flex items-center gap-2 text-slate-900 tracking-tight">
                <Shield className="h-4 w-4 text-bhutan-maroon" />
                What's Included
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                {[
                  'Dashboard & Analytics',
                  'POS Sales Module',
                  'Inventory Management',
                  'Customer & Supplier CRM',
                  'Transaction Ledger',
                  'GST Compliance',
                  'Financial Reports',
                  'Invoice Printing',
                  'Backup & Restore',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-600">
                    <Check className="h-3 w-3 text-bhutan-maroon flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
