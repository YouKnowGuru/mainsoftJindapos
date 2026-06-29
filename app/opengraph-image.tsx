import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Jinda POS — Modern POS & Accounting Software for Bhutan'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundImage: 'linear-gradient(135deg, #4A0E17 0%, #111827 100%)',
          padding: '80px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Top bar with Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: '#FFD700',
              color: '#7B1F3A',
              fontWeight: 900,
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              padding: '6px 16px',
              borderRadius: '20px',
            }}
          >
            Built for Bhutan
          </div>
          <div
            style={{
              color: '#FFD700',
              fontWeight: 700,
              fontSize: '18px',
              letterSpacing: '0.1em',
            }}
          >
            Offline-First POS
          </div>
        </div>

        {/* Middle Main Header */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '40px', gap: '20px' }}>
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 900,
              color: '#ffffff',
              margin: 0,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            Jinda <span style={{ color: '#FFD700' }}>POS</span>
          </h1>
          <p
            style={{
              fontSize: '32px',
              fontWeight: 600,
              color: '#D1D5DB',
              margin: 0,
              maxWidth: '900px',
              lineHeight: 1.4,
            }}
          >
            Accounting, inventory, and automatic 5% GST invoicing software built for Bhutanese businesses.
          </p>
        </div>

        {/* Bottom stats / features */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '2px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '40px',
            marginTop: 'auto',
          }}
        >
          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#9CA3AF', fontSize: '14px', textTransform: 'uppercase', fontWeight: 700 }}>Data Storage</span>
              <span style={{ color: '#ffffff', fontSize: '20px', fontWeight: 800 }}>100% Offline / Local</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#9CA3AF', fontSize: '14px', textTransform: 'uppercase', fontWeight: 700 }}>Tax Compliance</span>
              <span style={{ color: '#ffffff', fontSize: '20px', fontWeight: 800 }}>Auto 5% GST Reports</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#9CA3AF', fontSize: '14px', textTransform: 'uppercase', fontWeight: 700 }}>Payments</span>
              <span style={{ color: '#ffffff', fontSize: '20px', fontWeight: 800 }}>mBOB, BNB Pay, TPay</span>
            </div>
          </div>
          
          <div
            style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            jindapos.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
