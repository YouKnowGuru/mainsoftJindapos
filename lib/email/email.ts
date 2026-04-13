import nodemailer from 'nodemailer'

// Fixed: Use stable NEXTAUTH_URL instead of auto-changing VERCEL_URL
// VERCEL_URL changes with every preview deployment, causing email links to break
// Priority: 1. NEXTAUTH_URL (stable), 2. VERCEL_URL (production fallback), 3. localhost (dev)
const BASE_URL = process.env.NEXTAUTH_URL
  ? process.env.NEXTAUTH_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
const isDev = process.env.NODE_ENV === 'development'

/**
 * Create reusable transporter using existing SMTP config
 */
function createTransporter() {
  const pass = (process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');
  const user = (process.env.SMTP_USER || '').trim();

  if (!user || !pass) {
    console.error('[Email] ⚠️ SMTP_USER or SMTP_PASS is missing from environment variables!');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // TLS on port 587
    auth: { user, pass },
    tls: {
      rejectUnauthorized: !isDev, // Only allow self-signed certs in development
    },
  });
}

/**
 * Shared email template wrapper with Dhisum Tseyig branding
 */
function emailTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#020617;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#020617;min-height:100vh;">
<tr>
<td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">

<!-- Header -->
<tr>
<td align="center" style="padding-bottom:32px;">
<h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:-1px;font-style:italic;color:#ffffff;">
DHISUM <span style="color:#fbbf24;">TSEYIG</span>
</h1>
<div style="width:48px;height:3px;background:linear-gradient(90deg,#fbbf24,#f59e0b);margin:12px auto 0;border-radius:2px;"></div>
<p style="margin:8px 0 0;font-size:10px;color:#64748b;font-weight:700;letter-spacing:3px;text-transform:uppercase;">
Accounting & POS Ecosystem
</p>
</td>
</tr>

<!-- Card -->
<tr>
<td style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:40px 36px;">
${content}
</td>
</tr>

<!-- Footer -->
<tr>
<td align="center" style="padding-top:32px;">
<p style="margin:0;font-size:10px;color:#334155;font-weight:700;letter-spacing:4px;text-transform:uppercase;">
Dhisum Tseyig v1.0.0 — Himalayan Tech
</p>
<p style="margin:8px 0 0;font-size:11px;color:#475569;">
This is an automated email. Please do not reply.
</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`
}

/**
 * Send email verification link
 */
export async function sendVerificationEmail(email: string, token: string, username: string): Promise<void> {
  const verifyUrl = `${BASE_URL}/verify-email?token=${token}`

  const content = `
<h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ffffff;">
Verify Your Email
</h2>
<p style="margin:0 0 24px;font-size:14px;color:#94a3b8;line-height:1.6;">
Hello <strong style="color:#ffffff;">${escapeHtml(username)}</strong>,<br>
Welcome to Dhisum Tseyig! Please verify your email address to activate your account.
</p>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td align="center" style="padding:8px 0 24px;">
<a href="${verifyUrl}"
style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#0f172a;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-decoration:none;border-radius:16px;box-shadow:0 8px 24px rgba(245,158,11,0.3);">
✓ Verify Email Address
</a>
</td>
</tr>
</table>

<p style="margin:0 0 12px;font-size:12px;color:#64748b;line-height:1.5;">
Or copy and paste this link into your browser:
</p>
<p style="margin:0 0 24px;font-size:11px;color:#fbbf24;word-break:break-all;background:rgba(0,0,0,0.3);padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
${verifyUrl}
</p>

<div style="border-top:1px solid rgba(255,255,255,0.05);padding-top:16px;">
<p style="margin:0;font-size:11px;color:#475569;">
⏰ This link expires in <strong style="color:#94a3b8;">1 hour</strong>.<br>
If you didn't create a Dhisum Tseyig account, you can safely ignore this email.
</p>
</div>`

  const transporter = createTransporter()

  try {
    console.log(`[Email] Sending verification email to ${email}...`)
    await transporter.sendMail({
      from: `"Dhisum Tseyig" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify Your Email — Dhisum Tseyig',
      html: emailTemplate('Verify Your Email', content),
    })
    console.log(`[Email] Verification email sent successfully to ${email}`)
  } catch (error: any) {
    console.error(`[Email] Failed to send verification email to ${email}:`, error)
    throw new Error(`Failed to send verification email: ${error.message}`)
  }
}

/**
 * Send password reset link
 */
export async function sendPasswordResetEmail(email: string, token: string, username: string): Promise<void> {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`

  const content = `
<h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ffffff;">
Reset Your Password
</h2>
<p style="margin:0 0 24px;font-size:14px;color:#94a3b8;line-height:1.6;">
Hello <strong style="color:#ffffff;">${escapeHtml(username)}</strong>,<br>
We received a request to reset your password. Click the button below to set a new password.
</p>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td align="center" style="padding:8px 0 24px;">
<a href="${resetUrl}"
style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#ffffff;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-decoration:none;border-radius:16px;box-shadow:0 8px 24px rgba(239,68,68,0.3);">
🔒 Reset Password
</a>
</td>
</tr>
</table>

<p style="margin:0 0 12px;font-size:12px;color:#64748b;line-height:1.5;">
Or copy and paste this link into your browser:
</p>
<p style="margin:0 0 24px;font-size:11px;color:#fbbf24;word-break:break-all;background:rgba(0,0,0,0.3);padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
${resetUrl}
</p>

<div style="border-top:1px solid rgba(255,255,255,0.05);padding-top:16px;">
<p style="margin:0;font-size:11px;color:#475569;">
⏰ This link expires in <strong style="color:#94a3b8;">30 minutes</strong>.<br>
If you didn't request a password reset, your account is safe — just ignore this email.
</p>
</div>`

  const transporter = createTransporter()

  try {
    console.log(`[Email] Sending password reset email to ${email}...`)
    await transporter.sendMail({
      from: `"Dhisum Tseyig" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your Password — Dhisum Tseyig',
      html: emailTemplate('Reset Your Password', content),
    })
    console.log(`[Email] Password reset email sent successfully to ${email}`)
  } catch (error: any) {
    console.error(`[Email] Failed to send password reset email to ${email}:`, error)
    throw new Error(`Failed to send password reset email: ${error.message}`)
  }
}

/**
 * Send License Recovery OTP
 */
export async function sendLicenseOTPEmail(email: string, otp: string, licenseKey: string): Promise<void> {
  const content = `
<div style="text-align:center;">
<h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ffffff;">
License Recovery Code
</h2>
<p style="margin:0 0 24px;font-size:14px;color:#94a3b8;line-height:1.6;">
We received a request to link your license <strong style="color:#fbbf24;">${escapeHtml(licenseKey)}</strong> to a new device.
Use the verification code below to authorize this transfer.
</p>

<div style="background:rgba(251,191,36,0.1);border:2px dashed rgba(251,191,36,0.3);border-radius:24px;padding:32px;margin-bottom:24px;">
<span style="font-family:'Courier New',Courier,monospace;font-size:48px;font-weight:900;letter-spacing:12px;color:#fbbf24;">
${escapeHtml(otp)}
</span>
</div>

<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:16px;padding:16px;margin-bottom:24px;">
<p style="margin:0;font-size:12px;color:#f87171;font-weight:600;">
⚠️ Warning: You can only transfer this license 2 times per month.
</p>
</div>

<p style="margin:0;font-size:11px;color:#475569;">
⏰ This code expires in <strong style="color:#ffffff;">5 minutes</strong>.<br>
If you didn't request this, please ignore this email.
</p>
</div>`

  const transporter = createTransporter()

  try {
    console.log(`[Email] Sending license OTP to ${email}...`)
    await transporter.sendMail({
      from: `"Dhisum Tseyig" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'License Recovery Code — Dhisum Tseyig',
      html: emailTemplate('Authorize Device Transfer', content),
    })
    console.log(`[Email] License OTP sent successfully to ${email}`)
  } catch (error: any) {
    console.error(`[Email] Failed to send license OTP to ${email}:`, error)
    throw new Error(`Failed to send license OTP: ${error.message}`)
  }
}

/**
 * Send device verification OTP email
 */
export async function sendDeviceVerificationEmail(
  email: string,
  otp: string,
  deviceInfo?: { platform?: string; hostname?: string }
): Promise<void> {
  const deviceName = deviceInfo?.hostname || deviceInfo?.platform || 'New Device'
  const content = `<div style="text-align:center;">
<p style="font-size:16px;color:#94a3b8;margin-bottom:24px;">
We detected a login attempt from a new device.
</p>

<p style="font-size:16px;color:#94a3b8;margin-bottom:32px;">
Please verify this device by entering the following 6-digit code:
</p>

<div style="background:linear-gradient(180deg,#1e293b,#0f172a);border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:32px;display:inline-block;">
<div style="font-size:48px;font-weight:900;letter-spacing:12px;font-family:'Courier New',monospace;color:#fbbf24;">
${otp}
</div>
</div>

<p style="font-size:14px;color:#64748b;margin-bottom:16px;">
This code expires in <strong style="color:#ef4444;">5 minutes</strong>
</p>

<p style="font-size:14px;color:#64748b;margin-bottom:8px;">
Device: <strong style="color:#e2e8f0;">${escapeHtml(deviceName)}</strong>
</p>

<p style="font-size:12px;color:#475569;margin-top:32px;line-height:1.6;">
⚠️ If you didn't attempt this login, please contact support immediately.
</p>
</div>`

  const transporter = createTransporter()

  try {
    console.log(`[Email] Sending device verification OTP to ${email}...`)
    await transporter.sendMail({
      from: `"Dhisum Tseyig" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'New Device Verification Required — Dhisum Tseyig',
      html: emailTemplate('Verify New Device', content),
    })
    console.log(`[Email] Device verification OTP sent successfully to ${email}`)
  } catch (error: any) {
    console.error(`[Email] Failed to send device verification OTP to ${email}:`, error)
    throw new Error(`Failed to send device verification email: ${error.message}`)
  }
}

/**
 * Escape HTML to prevent XSS in email templates
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
