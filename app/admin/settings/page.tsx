'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Loader2,
  Save,
  User,
  Lock,
  Bell,
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

export default function AdminSettingsPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [profileData, setProfileData] = useState({
    username: 'admin',
    email: 'admin@sitejinda.com',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setMessage(null)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    setMessage({ type: 'success', text: 'Profile updated successfully' })
    setIsSaving(false)
  }

  const handleChangePassword = async () => {
    setIsSaving(true)
    setMessage(null)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      setIsSaving(false)
      return
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    setMessage({ type: 'success', text: 'Password changed successfully' })
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setIsSaving(false)
  }

  return (
    <div className="space-y-10 stagger-in">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-bhutan-gold/5 blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-bhutan-maroon flex items-center justify-center shadow-lg shadow-bhutan-maroon/20">
            <Database className="h-7 w-7 text-bhutan-gold" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Configuration</h1>
            <p className="text-sm font-bold text-slate-400">
              Fine-tune your platform environment and security
            </p>
          </div>
        </div>
      </div>

      {message && (
        <Alert className={cn(
          "rounded-2xl border-none shadow-lg animate-float",
          message.type === 'error' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
        )}>
          <AlertDescription className="font-bold flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="space-y-8">
        <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl h-14 border border-slate-100">
          <TabsTrigger value="profile" className="rounded-xl px-8 font-black text-[11px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-bhutan-maroon data-[state=active]:shadow-sm transition-all">
            <User className="h-3.5 w-3.5 mr-2" />
            Identity
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl px-8 font-black text-[11px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-bhutan-maroon data-[state=active]:shadow-sm transition-all">
            <Lock className="h-3.5 w-3.5 mr-2" />
            Shield
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl px-8 font-black text-[11px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-bhutan-maroon data-[state=active]:shadow-sm transition-all">
            <Bell className="h-3.5 w-3.5 mr-2" />
            Pulses
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-xl px-8 font-black text-[11px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-bhutan-maroon data-[state=active]:shadow-sm transition-all">
            <Database className="h-3.5 w-3.5 mr-2" />
            Core
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
              <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Identity Profile</CardTitle>
              <CardDescription className="font-bold text-slate-400">
                Primary administrative contact credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Handle / ID</Label>
                  <Input
                    id="username"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    className="h-12 bg-slate-50 border-slate-100 focus:bg-white rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="h-12 bg-slate-50 border-slate-100 focus:bg-white rounded-xl font-bold"
                  />
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-bhutan-maroon hover:bg-bhutan-maroon-dark text-white font-black rounded-xl px-8 h-12 shadow-lg shadow-bhutan-maroon/10">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Commit Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
              <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Encrypted Shield</CardTitle>
              <CardDescription className="font-bold text-slate-400">
                Revoke current session by rotating your access key
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6 max-w-2xl">
              <div className="space-y-3">
                <Label htmlFor="currentPassword" title="Current access key" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Key</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="h-12 bg-slate-50 border-slate-100 focus:bg-white rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="newPassword" title="New access key" className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Key</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="h-12 bg-slate-50 border-slate-100 focus:bg-white rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="confirmPassword" title="Confirm new key" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verify Key</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="h-12 bg-slate-50 border-slate-100 focus:bg-white rounded-xl font-bold"
                  />
                </div>
              </div>
              <Button onClick={handleChangePassword} disabled={isSaving} className="bg-slate-900 hover:bg-black text-white font-black rounded-xl px-8 h-12 shadow-xl shadow-slate-200">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rotating...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Rotate Access Key
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-0">
          <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
              <CardTitle className="text-xl font-black text-slate-800 tracking-tight">System Pulses</CardTitle>
              <CardDescription className="font-bold text-slate-400">
                Event-driven notification hooks
              </CardDescription>
            </CardHeader>
            <CardContent className="p-20 text-center">
              <Bell className="h-16 w-16 text-slate-100 mx-auto mb-6" />
              <h3 className="text-lg font-black text-slate-300 uppercase tracking-widest">Under Construction</h3>
              <p className="text-sm font-bold text-slate-400 mt-2 max-w-sm mx-auto">
                A comprehensive websocket pulse system is currently being engineered to deliver real-time telemetry.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-0">
          <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
              <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Core Telemetry</CardTitle>
              <CardDescription className="font-bold text-slate-400">
                Platform infrastructure and operational metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Build Version</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">1.2.4-PRO</p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Environment</p>
                  <Badge className="bg-bhutan-gold text-bhutan-maroon border-none font-black text-[9px] px-3 py-1 rounded-full">PRODUCTION</Badge>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Engine</p>
                  <p className="text-sm font-black text-slate-700 tracking-tight">MongoDB Atlas Cluster</p>
                  <div className="h-1 w-12 bg-green-500 rounded-full mt-2" />
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Last Sync</p>
                  <p className="text-sm font-black text-slate-700 tracking-tight">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
