import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const termsOfService = {
    title: 'Terms of Service',
    effectiveDate: 'April 2026',
    sections: [
      {
        title: 'Using the Software',
        content: 'By using Jinda, you agree to these terms. If you do not agree, please do not use the software. You can contact us with any questions.',
      },
      {
        title: 'Your Account',
        content: 'Keep your login details safe. You are responsible for all activity under your account. If you suspect unauthorized access, contact us immediately.',
      },
      {
        title: 'Service Availability',
        content: 'Jinda is a desktop application that runs on your computer. Since data is stored locally, service availability depends on your device health. We recommend regular backups.',
      },
      {
        title: 'What You Cannot Do',
        content: 'You may not copy, modify, redistribute, reverse engineer, or attempt to crack the software. Do not use the software for any illegal activity.',
      },
      {
        title: 'Limitation of Liability',
        content: 'Jinda is provided "as is." We do not guarantee the software will be error-free. We are not liable for any damages resulting from your use of the software.',
      },
      {
        title: 'Governing Law',
        content: 'These terms are governed by the laws of the Kingdom of Bhutan. Any disputes will be handled within Bhutanese jurisdiction.',
      },
    ],
    changesNotice: 'We may update these terms from time to time. Continued use of the software after changes means you accept the new terms.',
  }

  return NextResponse.json(termsOfService)
}
