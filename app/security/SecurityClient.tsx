'use client'

import React from 'react'
import Link from 'next/link'
import {
  Shield, Lock, Key, Eye, Server, Database, Fingerprint,
  RefreshCw, Cloud, HardDrive, UserCog, Scan, FileLock, CheckCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InteractiveCard } from '@/components/InteractiveCard'

const securityFeatures = [
  {
    icon: Lock,
    title: 'Encrypted Passwords',
    description: 'Every password is hashed with bcrypt (12 rounds) before storage. Even if someone accesses the database, passwords cannot be read.',
    details: ['bcrypt with 12 salt rounds', 'Server-side hashing', 'No plain-text passwords'],
  },
  {
    icon: Fingerprint,
    title: 'Hardware-Locked License',
    description: 'Each license is bound to one specific computer. The software cannot be copied or moved to another machine without a license reset.',
    details: ['Unique device fingerprint', 'Anti-piracy protection', 'Transfer limits tracked'],
  },
  {
    icon: Scan,
    title: 'Device Verification (OTP)',
    description: 'When logging in from a new device, a 6-digit code is sent to your email. Only verified devices can access your account.',
    details: ['6-digit OTP code', '3 attempt limit', '15-minute lockout on failure', '5-minute code expiry'],
  },
  {
    icon: Key,
    title: 'Secure Login System',
    description: 'Multi-layer login security with account lockout, rate limiting, and automatic detection of suspicious activity.',
    details: ['Account lockout after failed attempts', 'Rate limiting protection', 'Trial enforcement', 'Offline fallback'],
  },
  {
    icon: Server,
    title: 'Encrypted Token Storage',
    description: 'Login tokens are encrypted using AES-256-GCM authentication. Tokens auto-refresh and are securely cleared on logout.',
    details: ['AES-256-GCM encryption', 'Auto token refresh', 'Token reuse detection', 'Secure logout'],
  },
  {
    icon: UserCog,
    title: 'Role-Based Access Control',
    description: 'Two user roles — Admin and Staff. Admins have full access. Staff users can only use POS and basic features.',
    details: ['Admin and Staff roles', 'Restricted settings access', 'Authorization checks', 'Activity status tracking'],
  },
  {
    icon: Eye,
    title: 'Complete Audit Trail',
    description: 'Every action is logged — logins, sales, edits, deletions. See who did what and when. Export full audit reports.',
    details: ['All user actions logged', 'Old and new values tracked', 'CSV export available', 'Category filtering'],
  },
  {
    icon: Database,
    title: 'Database Protection',
    description: 'SQL injection prevention, parameterized queries, foreign key enforcement, and secure directory permissions.',
    details: ['Table name whitelisting', 'Parameterized queries', 'Foreign key enforcement', 'Secure delete mode'],
  },
  {
    icon: Cloud,
    title: 'Encrypted Cloud Backups',
    description: 'Backups are compressed, encrypted with AES-256-CBC, and uploaded to Google Drive or MEGA. Your data is safe even if your computer fails.',
    details: ['AES-256-CBC encryption', 'Google Drive & MEGA support', '30-day backup rotation', 'Auto-restore validation'],
  },
  {
    icon: Shield,
    title: 'Period Locking',
    description: 'Lock financial periods (month/year) to prevent any changes to past transactions. Ensures your books cannot be altered after filing.',
    details: ['Lock any month or year', 'Prevents transaction edits', 'Compliance-ready', 'Admin controlled'],
  },
  {
    icon: FileLock,
    title: 'Encrypted Trial Lock',
    description: 'The 7-day free trial is protected with an encrypted file that cannot be deleted or reset. Prevents trial abuse.',
    details: ['AES-256-CBC encrypted trial file', 'Device-specific encryption key', 'Cannot be reset or bypassed'],
  },
  {
    icon: RefreshCw,
    title: 'Secure License Verification',
    description: 'The software checks your license with the server every 24 hours. If offline, a 30-day grace period keeps you running.',
    details: ['Daily server verification', '30-day offline grace period', 'Multi-stage activation flow'],
  },
]

const securityStats = [
  { icon: Lock, label: 'Encryption', value: 'AES-256', sublabel: 'Military-grade' },
  { icon: Key, label: 'Password Hashing', value: 'bcrypt', sublabel: '12 salt rounds' },
  { icon: Shield, label: 'Auth Tokens', value: 'AES-256-GCM', sublabel: 'Authenticated' },
  { icon: Database, label: 'Database', value: 'SQLite', sublabel: 'Local & secure' },
  { icon: Cloud, label: 'Cloud Backup', value: 'Encrypted', sublabel: 'Drive & MEGA' },
  { icon: Eye, label: 'Audit Trail', value: 'Complete', sublabel: 'Every action' },
]

export default function SecurityClient() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-bhutan-maroon-dark py-16 md:py-24 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-bhutan-gold/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-bhutan-maroon/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="container relative z-10 px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6 stagger-in">
            <Badge className="bg-bhutan-gold text-bhutan-maroon-dark border-none px-4 py-1.5 rounded-full font-black tracking-widest uppercase text-[10px]">Security First</Badge>
            <h1 className="text-3xl md:text-6xl font-black tracking-tight leading-tight text-glow-maroon">
              Your Data Is <span className="text-bhutan-gold">Protected</span>
            </h1>
            <p className="text-sm md:text-lg text-white/60 font-medium leading-relaxed max-w-xl mx-auto">
              Enterprise-grade security built into every layer. From password encryption to cloud backups — your business data is always safe.
            </p>
          </div>
        </div>
      </section>

      {/* Security Stats */}
      <section className="py-10 md:py-14 border-b bg-white">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {securityStats.map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-bhutan-maroon/10 text-bhutan-maroon flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-lg font-black text-slate-900">{stat.value}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{stat.label}</p>
                <p className="text-[9px] text-slate-500 font-medium">{stat.sublabel}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Features Grid */}
      <section className="py-16 md:py-20 bg-slate-50/50">
        <div className="container px-4 md:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-black mb-3 tracking-tight">12 Layers of Protection</h2>
            <p className="text-sm text-slate-500 font-medium">Every part of the system is designed with security in mind.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {securityFeatures.map((feature) => (
              <InteractiveCard key={feature.title} className="p-5 md:p-6 bg-white border border-slate-100 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-bhutan-maroon/10 text-bhutan-maroon flex-shrink-0 group-hover:bg-bhutan-maroon group-hover:text-bhutan-gold transition-all duration-300">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight">{feature.title}</h3>
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium leading-relaxed mt-1">{feature.description}</p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {feature.details.map((detail) => (
                    <li key={detail} className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-600">
                      <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </InteractiveCard>
            ))}
          </div>
        </div>
      </section>

      {/* Security Architecture */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-black mb-3 tracking-tight">How Your Data Is Protected</h2>
              <p className="text-sm text-slate-500 font-medium">A complete picture of our security approach.</p>
            </div>

            <div className="space-y-6">
              {[
                {
                  step: 1,
                  title: 'Data Stays on Your Computer',
                  description: 'Your sales, inventory, and customer data are stored locally in a secure SQLite database on your machine. We do not collect or store your business transactions on any external server.',
                  icon: HardDrive,
                },
                {
                  step: 2,
                  title: 'Passwords Are Never Stored',
                  description: 'Every password is converted into a one-way hash using bcrypt with 12 rounds of salt. Even if someone gets access to the database file, they cannot reverse-engineer your password.',
                  icon: Lock,
                },
                {
                  step: 3,
                  title: 'Login Tokens Are Encrypted',
                  description: 'After logging in, your session token is encrypted with AES-256-GCM and stored securely. Tokens auto-refresh before expiry and are completely cleared when you log out.',
                  icon: Key,
                },
                {
                  step: 4,
                  title: 'Every Action Is Recorded',
                  description: 'The audit trail logs every login, sale, edit, and deletion with timestamps and user details. You can see exactly who changed what and when. Full reports can be exported as CSV.',
                  icon: Eye,
                },
                {
                  step: 5,
                  title: 'Backups Are Encrypted in the Cloud',
                  description: 'If you enable cloud backup, your database is compressed, encrypted with AES-256-CBC, and uploaded to Google Drive or MEGA. Only you hold the decryption key.',
                  icon: Cloud,
                },
                {
                  step: 6,
                  title: 'License Cannot Be Copied or Reset',
                  description: 'Your license is bound to your computer\'s unique hardware ID. The trial period is protected with an encrypted file that cannot be deleted or reset. Any attempt to crack the software results in immediate license termination.',
                  icon: Fingerprint,
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-5 p-5 md:p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-all">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl bg-bhutan-maroon/10 text-bhutan-maroon flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="w-px h-full bg-bhutan-maroon/10 mt-2 last:hidden" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-black text-bhutan-maroon uppercase tracking-widest">Step {item.step}</span>
                      <h3 className="text-sm md:text-base font-black text-slate-900">{item.title}</h3>
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-bhutan-maroon text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-bhutan-gold/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="container text-center relative z-10">
          <h2 className="text-2xl md:text-4xl font-black mb-4 tracking-tight">Security You Can Trust</h2>
          <p className="text-bhutan-gold font-medium mb-8 max-w-lg mx-auto">
            Try Jinda free for 7 days. Your data stays on your computer — always.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/download">
              <Button size="lg" className="bg-bhutan-gold text-bhutan-maroon-dark hover:bg-white font-black h-14 px-8 rounded-2xl shadow-xl transition-all">
                Download Free Trial
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 font-bold h-14 px-8 rounded-2xl backdrop-blur-md">
                Ask About Security
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
