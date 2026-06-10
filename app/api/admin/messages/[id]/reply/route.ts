import mongoose from 'mongoose'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import connectDB from '@/lib/db/mongodb'
import { ContactMessage } from '@/lib/models/contact-message'
import { authOptions } from '@/lib/auth/auth.config'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'
import nodemailer from 'nodemailer'

const isDev = process.env.NODE_ENV === 'development'

// Configure Nodemailer transporter based on .env credentials
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // TLS/STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: !isDev // Only allow self-signed certs in development
  }
})

/**
 * Escape HTML to prevent XSS in email content
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  }
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char)
}

// POST /api/admin/messages/[id]/reply - Send reply to a given message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.role || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Apply rate limiting
    const rateLimitResponse = await apiRateLimit(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid message ID format' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { replyText } = body

    if (!replyText || typeof replyText !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Reply text is required.' },
        { status: 400 }
      )
    }

    // Validate reply length to prevent abuse
    if (replyText.length > 10000) {
      return NextResponse.json(
        { success: false, error: 'Reply text is too long (max 10000 characters).' },
        { status: 400 }
      )
    }

    await connectDB()

    // Find the original message to get the user's email
    const originalMessage = await ContactMessage.findById(id)

    if (!originalMessage) {
      return NextResponse.json(
        { success: false, error: 'Original message not found.' },
        { status: 404 }
      )
    }

    // Sanitize reply text for HTML email
    const sanitizedReply = escapeHtml(replyText)
    const sanitizedName = escapeHtml(originalMessage.name)
    const sanitizedMessage = escapeHtml(originalMessage.message)
    const sanitizedSubject = escapeHtml(originalMessage.subject)

    // Attempt to send the email reply using Nodemailer
    try {
      await transporter.sendMail({
        from: `"Jinda Support" <${process.env.SMTP_USER}>`,
        to: originalMessage.email,
        subject: `Re: ${sanitizedSubject}`,
        html: `
<!DOCTYPE html>
<html>
<head>
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
.wrapper { width: 100%; padding: 40px 0; }
.container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 32px; overflow: hidden; box-shadow: 0 30px 60px rgba(128, 0, 0, 0.08); border: 1px solid #f1f5f9; }
.header { background: linear-gradient(135deg, #800000 0%, #4a0000 100%); padding: 50px 40px; text-align: center; position: relative; }
.header::after { content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: #FFD700; }
.logo { background: #FFD700; width: 60px; height: 60px; line-height: 60px; border-radius: 16px; display: inline-block; font-weight: 800; color: #800000; font-size: 24px; margin-bottom: 20px; box-shadow: 0 8px 16px rgba(255, 215, 0, 0.4); }
.header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.5px; font-weight: 800; }
.content { padding: 48px; color: #334155; }
.greeting { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 24px; }
.reply-body { font-size: 16px; line-height: 1.8; color: #475569; margin-bottom: 40px; white-space: pre-wrap; }
.signature { margin-top: 48px; padding-top: 32px; border-top: 1px solid #f1f5f9; }
.signature p { margin: 4px 0; font-size: 14px; color: #64748b; }
.signature strong { color: #800000; font-weight: 800; font-size: 16px; }
.original-quote { background: #f8fafc; border-left: 3px solid #cbd5e1; padding: 24px; margin-top: 48px; border-radius: 4px 16px 16px 4px; }
.original-quote-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 12px; }
.original-text { font-size: 13px; line-height: 1.6; color: #64748b; font-style: italic; margin: 0; }
.footer { padding: 32px; background: #ffffff; text-align: center; }
.footer p { margin: 0; font-size: 11px; color: #cbd5e1; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
</style>
</head>
<body>
<div class="wrapper">
<div class="container">
<div class="header">
<div class="logo">DT</div>
<h1>Message from Jinda</h1>
</div>
<div class="content">
<p class="greeting">Hello ${sanitizedName},</p>
<div class="reply-body">${sanitizedReply}</div>

<div class="signature">
<p>Warm regards,</p>
<strong>Jinda Support Team</strong>
<p>Damphu, Our Store • Bhutan</p>
</div>

<div class="original-quote">
<div class="original-quote-title">Regarding your inquiry from ${new Date(originalMessage.createdAt).toLocaleDateString()}</div>
<p class="original-text">"${sanitizedMessage}"</p>
</div>
</div>
<div class="footer">
<p>© 2026 Jinda POS Solutions</p>
</div>
</div>
</div>
</body>
</html>
`,
      })
    } catch (emailError) {
      console.error('Failed to send reply email:', emailError)
      return NextResponse.json(
        { success: false, error: 'Failed to dispatch email. Check SMTP settings.' },
        { status: 500 }
      )
    }

    // Update the message status in the database to 'Replied' and store the reply body
    const updatedMessage = await ContactMessage.findByIdAndUpdate(
      id,
      {
        status: 'Replied',
        replyNote: replyText,
      },
      { new: true }
    )

    return NextResponse.json({
      success: true,
      data: updatedMessage,
      message: 'Reply sent successfully',
    })
  } catch (error) {
    console.error('Reply dispatch error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error processing reply.' },
      { status: 500 }
    )
  }
}
