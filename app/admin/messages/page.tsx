'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    MessageSquare,
    Search,
    Mail,
    Clock,
    CheckCircle2,
    CornerDownRight,
    Send,
    Loader2,
    AlertCircle
} from 'lucide-react'

interface Message {
    _id: string
    name: string
    email: string
    subject: string
    message: string
    status: 'Unread' | 'Read' | 'Replied'
    replyNote?: string
    createdAt: string
}

export default function AdminMessagesPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)

    const [replyText, setReplyText] = useState('')
    const [isReplying, setIsReplying] = useState(false)
    const [replyError, setReplyError] = useState('')

    useEffect(() => {
        fetchMessages()
    }, [])

    const fetchMessages = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/admin/messages')
            const data = await res.json()
            if (data.success) {
                setMessages(data.data)
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectMessage = async (msg: Message) => {
        setSelectedMessage(msg)
        setReplyText('')
        setReplyError('')

        // If Unread, automatically mark as Read when clicking it
        if (msg.status === 'Unread') {
            try {
                const res = await fetch('/api/admin/messages', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: msg._id, status: 'Read' }),
                })
                const data = await res.json()
                if (data.success) {
                    setMessages(messages.map(m => m._id === msg._id ? { ...m, status: 'Read' } : m))
                    setSelectedMessage({ ...msg, status: 'Read' })
                }
            } catch (error) {
                console.error('Failed to mark read:', error)
            }
        }
    }

    const handleSendReply = async () => {
        if (!selectedMessage || !replyText.trim()) return

        try {
            setIsReplying(true)
            setReplyError('')
            const res = await fetch(`/api/admin/messages/${selectedMessage._id}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ replyText }),
            })

            const data = await res.json()
            if (data.success) {
                setMessages(messages.map(m => m._id === selectedMessage._id ? data.data : m))
                setSelectedMessage(data.data)
                setReplyText('')
            } else {
                setReplyError(data.error || 'Failed to send reply.')
            }
        } catch (error) {
            setReplyError('Network error while dispatching reply.')
        } finally {
            setIsReplying(false)
        }
    }

    const filteredMessages = messages.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.subject.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const unreadCount = messages.filter(m => m.status === 'Unread').length

    return (
        <div className="space-y-8 pb-8">
            {/* Header Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300">

                <div className="space-y-1 flex-shrink-0 w-full md:w-auto">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
                        <div className="bg-bhutan-maroon/10 p-2 rounded-xl text-bhutan-maroon relative">
                            <MessageSquare className="w-6 h-6" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                            )}
                        </div>
                        Unified Inbox
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Manage support tickets and customer inquiries</p>
                </div>

                <div className="flex-1 w-full max-w-xl">
                    <div className="relative group">
                        <div className="relative flex items-center bg-slate-50 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-bhutan-maroon/20 focus-within:border-bhutan-maroon transition-all duration-300">
                            <Search className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-bhutan-maroon transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search messages by name, email, or subject..."
                                className="w-full pl-12 pr-4 py-3 bg-transparent border-none outline-none focus:ring-0 text-slate-700 placeholder:text-slate-400 font-medium h-full rounded-xl text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-250px)] min-h-[600px]">
                {/* Messages List Sidebar */}
                <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 text-sm tracking-wide uppercase">All Conversations</h3>
                        <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 px-3 font-semibold">
                            {messages.length} Total
                        </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto w-full no-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                                <Loader2 className="h-8 w-8 animate-spin text-bhutan-maroon/50" />
                                <p className="text-sm font-medium">Loading inbox...</p>
                            </div>
                        ) : filteredMessages.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 space-y-3">
                                <div className="p-4 rounded-full bg-slate-50 inline-block mb-2">
                                    <Mail className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="font-medium text-sm">No messages found.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {filteredMessages.map((msg) => (
                                    <button
                                        key={msg._id}
                                        onClick={() => handleSelectMessage(msg)}
                                        className={`w-full text-left p-5 transition-all duration-200 border-l-4 ${selectedMessage?._id === msg._id
                                            ? 'bg-slate-50 border-bhutan-maroon shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]'
                                            : msg.status === 'Unread'
                                                ? 'bg-white border-blue-500 hover:bg-slate-50/80'
                                                : 'bg-white border-transparent hover:bg-slate-50/50'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2 gap-2">
                                            <h4 className={`font-semibold truncate text-sm ${msg.status === 'Unread' ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                                                {msg.name}
                                            </h4>
                                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider">
                                                {new Date(msg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <p className={`text-sm truncate mb-3 ${msg.status === 'Unread' ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                                            {msg.subject}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Badge className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${msg.status === 'Unread' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                                                msg.status === 'Replied' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                                                    'bg-slate-100 text-slate-500 hover:bg-slate-100'
                                                }`}>
                                                {msg.status}
                                            </Badge>
                                            {msg.status === 'Replied' && (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Message Details & Reply Panel */}
                <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col relative">
                    {!selectedMessage ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4 bg-slate-50/30">
                            <div className="p-6 rounded-full bg-slate-50 border border-slate-100 shadow-sm">
                                <MessageSquare className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-600 tracking-tight">Select a Conversation</h3>
                            <p className="text-sm font-medium">Choose a message from the list to view and reply.</p>
                        </div>
                    ) : (
                        <>
                            {/* Message Header */}
                            <div className="p-6 md:p-8 border-b border-slate-100 bg-white">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">{selectedMessage.subject}</h2>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-semibold text-slate-700">{selectedMessage.name}</span>
                                            <span className="text-slate-300">&bull;</span>
                                            <a href={`mailto:${selectedMessage.email}`} className="text-bhutan-maroon hover:underline font-medium">
                                                {selectedMessage.email}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                        <Clock className="w-3.5 h-3.5" />
                                        {new Date(selectedMessage.createdAt).toLocaleString(undefined, {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Message Thread */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/30">
                                {/* Original Message */}
                                <div className="flex gap-4 max-w-4xl">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                        <span className="text-slate-500 font-bold uppercase text-sm">{selectedMessage.name.charAt(0)}</span>
                                    </div>
                                    <div className="flex-1 bg-white p-6 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm">
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                            {selectedMessage.message}
                                        </p>
                                    </div>
                                </div>

                                {/* Reply Note (if already replied) */}
                                {selectedMessage.status === 'Replied' && selectedMessage.replyNote && (
                                    <div className="flex gap-4 max-w-4xl ml-auto justify-end">
                                        <div className="flex-1 bg-gradient-to-br from-bhutan-maroon to-bhutan-maroon-dark p-6 rounded-2xl rounded-tr-sm shadow-md text-white">
                                            <div className="flex items-center gap-2 mb-3 text-white/70 text-xs font-bold uppercase tracking-wider">
                                                <CornerDownRight className="w-3.5 h-3.5" />
                                                Admin Reply Sent
                                            </div>
                                            <p className="text-sm text-white/95 whitespace-pre-wrap leading-relaxed">
                                                {selectedMessage.replyNote}
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-bhutan-gold border border-bhutan-gold/50 flex items-center justify-center shrink-0 shadow-sm">
                                            <span className="text-bhutan-maroon font-black uppercase text-sm">DT</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Reply Composer (Only show if not yet replied) */}
                            {selectedMessage.status !== 'Replied' && (
                                <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                                    {replyError && (
                                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold flex items-center gap-2 border border-red-100">
                                            <AlertCircle className="w-4 h-4" />
                                            {replyError}
                                        </div>
                                    )}
                                    <div className="relative group/reply border border-slate-200 focus-within:border-bhutan-maroon focus-within:ring-4 focus-within:ring-bhutan-maroon/10 rounded-2xl transition-all duration-300">
                                        <Textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder={`Draft a reply to ${selectedMessage.name}...`}
                                            className="min-h-[120px] resize-none border-none shadow-none focus-visible:ring-0 p-4 text-sm font-medium bg-transparent"
                                        />
                                        <div className="absolute bottom-3 right-3">
                                            <Button
                                                onClick={handleSendReply}
                                                disabled={isReplying || !replyText.trim()}
                                                className="bg-bhutan-maroon hover:bg-bhutan-maroon-dark text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all h-10 px-6 gap-2"
                                            >
                                                {isReplying ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                                                ) : (
                                                    <><Send className="w-4 h-4" /> Send Reply via Email</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-3 text-center">
                                        This will instantly dispatch an email notification to the customer.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
