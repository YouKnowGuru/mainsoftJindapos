import { NextRequest, NextResponse } from 'next/server'
import { contactFormSchema } from '@/lib/validation/schemas'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'
import { ZodError } from 'zod'
import connectDB from '@/lib/db/mongodb'
import { ContactMessage } from '@/lib/models/contact-message'
import nodemailer from 'nodemailer'

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
})

// POST /api/contact - Submit contact form
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Apply rate limiting
    const rateLimitResponse = await apiRateLimit(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // 2. Parse and validate request body
    const body = await req.json()
    const validatedData = contactFormSchema.parse(body)

    // 3. Connect to Database and Save Message
    await connectDB()
    const newMessage = await ContactMessage.create({
      name: validatedData.name,
      email: validatedData.email,
      subject: validatedData.subject,
      message: validatedData.message,
      status: 'Unread',
    })

    // 4. Send Email Notification to Admin via Nodemailer
    try {
      await transporter.sendMail({
        from: `"${validatedData.name}" <${process.env.SMTP_USER}>`, // Send via authenticated SMTP user to avoid spam filters
        replyTo: validatedData.email, // Replies go straight to the customer
        to: process.env.SMTP_USER, // Send to your own email address
        subject: `New Contact Form Submission: ${validatedData.subject}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
                body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; }
                .wrapper { width: 100%; padding: 40px 0; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.05); }
                .header { background: linear-gradient(135deg, #800000 0%, #4a0000 100%); padding: 40px; text-align: center; border-bottom: 4px solid #FFD700; }
                .logo { background: #FFD700; width: 50px; height: 50px; line-height: 50px; border-radius: 12px; display: inline-block; font-weight: 900; color: #800000; font-size: 20px; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3); }
                .header h1 { color: #ffffff; margin: 0; font-size: 22px; letter-spacing: -0.5px; font-weight: 800; }
                .content { padding: 40px; color: #334155; }
                .user-info { display: flex; align-items: center; margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; }
                .user-info p { margin: 5px 0; font-size: 14px; color: #64748b; }
                .user-info strong { color: #1e293b; }
                .message-box { background: #ffffff; border-left: 4px solid #800000; padding: 25px; margin: 25px 0; font-style: italic; border-radius: 4px 16px 16px 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
                .message-box p { margin: 0; line-height: 1.6; color: #1e293b; font-size: 16px; }
                .footer { padding: 30px; background: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0; }
                .footer p { margin: 0; font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
              </style>
            </head>
            <body>
              <div class="wrapper">
                <div class="container">
                  <div class="header">
                    <div class="logo">DT</div>
                    <h1>New Message Received</h1>
                  </div>
                  <div class="content">
                    <div class="user-info">
                      <div>
                        <p><strong>From:</strong> ${validatedData.name}</p>
                        <p><strong>Email:</strong> ${validatedData.email}</p>
                        <p><strong>Subject:</strong> ${validatedData.subject}</p>
                      </div>
                    </div>
                    <div class="message-box">
                      <p>"${validatedData.message}"</p>
                    </div>
                  </div>
                  <div class="footer">
                    <p>Jinda • Admin Notification</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      })
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError)
      // We don't fail the whole request if just the email fails, as it's saved in the DB.
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your message. We will get back to you soon!',
      data: newMessage,
    })
  } catch (error) {
    console.error('Contact form error:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error processing your request.' },
      { status: 500 }
    )
  }
}
