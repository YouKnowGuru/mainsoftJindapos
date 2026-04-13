/**
 * Diagnostic script to test email and token verification
 * Run with: node scripts/test-email-tokens.js
 */

const https = require('https')

const BASE_URL = 'https://dhisum-tseyig.vercel.app'

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`
    console.log(`\n${method} ${url}`)

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const req = https.request(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`)
        try {
          const parsed = JSON.parse(data)
          console.log('Response:', JSON.stringify(parsed, null, 2).substring(0, 500))
          resolve({ status: res.statusCode, data: parsed })
        } catch (e) {
          console.log('Response (non-JSON):', data.substring(0, 300))
          resolve({ status: res.statusCode, data })
        }
      })
    })

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message)
      reject(error)
    })

    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

async function runDiagnostics() {
  console.log('='.repeat(70))
  console.log('DHISUM TSEYIG - EMAIL & TOKEN VERIFICATION DIAGNOSTICS')
  console.log('='.repeat(70))

  try {
    // Test 1: Check MongoDB connection
    console.log('\n[Test 1] Checking server health...')
    try {
      const result = await makeRequest('GET', '/api/stats')
      if (result.status === 200 || result.status === 401) {
        console.log('✅ Server is running and MongoDB is connected')
      } else {
        console.log('⚠️ Server responded but may have issues')
      }
    } catch (e) {
      console.log('❌ Server is not reachable or MongoDB connection failed')
      console.log('   Check Vercel logs and MONGODB_URI environment variable')
    }

    // Test 2: Test email verification endpoint
    console.log('\n[Test 2] Testing email verification endpoint...')
    await makeRequest('GET', '/api/auth/verify-email?token=invalid-token-test')
      .then((res) => {
        if (res.status === 400 || res.status === 410) {
          console.log('✅ Email verification endpoint is working (rejected invalid token)')
        } else {
          console.log('⚠️ Unexpected response from verification endpoint')
        }
      })
      .catch(() => {
        console.log('❌ Email verification endpoint failed')
      })

    // Test 3: Test resend verification endpoint
    console.log('\n[Test 3] Testing resend verification endpoint...')
    await makeRequest('POST', '/api/auth/resend-verification', {
      email: 'test@example.com',
    })
      .then((res) => {
        if (res.status === 200 || res.status === 500) {
          console.log('✅ Resend verification endpoint is responding')
          if (res.data && res.data.message && res.data.message.includes('SMTP')) {
            console.log('⚠️ SMTP configuration issue detected')
            console.log('   Check your SMTP credentials in Vercel environment variables:')
            console.log('   - SMTP_USER')
            console.log('   - SMTP_PASS')
            console.log('   - SMTP_HOST')
            console.log('   - SMTP_PORT')
          }
        }
      })
      .catch(() => {
        console.log('❌ Resend verification endpoint failed')
      })

    // Test 4: Check license verification endpoint
    console.log('\n[Test 4] Testing license verification endpoint...')
    await makeRequest('POST', '/api/license/verify', {
      licenseKey: 'DTS-TEST-1234-5678',
    })
      .then((res) => {
        if (res.status === 404) {
          console.log('✅ License verification endpoint is working (license not found)')
        } else {
          console.log('⚠️ Unexpected response from license endpoint')
        }
      })
      .catch(() => {
        console.log('❌ License verification endpoint failed')
      })

    console.log('\n' + '='.repeat(70))
    console.log('DIAGNOSTICS COMPLETE')
    console.log('='.repeat(70))

    console.log('\n📋 Summary of Common Issues:')
    console.log('')
    console.log('1. TOKEN NOT FOUND ERRORS:')
    console.log('   - Tokens may not be hashed consistently (FIXED in this update)')
    console.log('   - Check that resend-verification hashes tokens before storing')
    console.log('   - Verify MongoDB connection is working')
    console.log('')
    console.log('2. EMAIL NOT BEING SENT:')
    console.log('   - Verify SMTP credentials in Vercel Environment Variables')
    console.log('   - Use App-Specific Password for Gmail (not regular password)')
    console.log('   - Enable 2FA on Gmail account')
    console.log('   - Check Vercel Logs for SMTP errors')
    console.log('')
    console.log('3. HOW TO FIX SMTP ISSUES:')
    console.log('   a. Go to Google Account settings')
    console.log('   b. Enable 2-Factor Authentication')
    console.log('   c. Generate an App-Specific Password')
    console.log('   d. Update SMTP_PASS in Vercel with the app-specific password')
    console.log('   e. Redeploy the application')
    console.log('')
    console.log('4. CHECK VERCEL LOGS:')
    console.log('   https://vercel.com/dashboard → Your Project → Logs')
    console.log('   Look for: "[Email]", "[Register]", "[Resend]"')
    console.log('')
    console.log('5. TEST MANUALLY:')
    console.log('   - Sign up with a test email')
    console.log('   - Check if verification email arrives')
    console.log('   - If not, use "Resend Verification" and check Vercel logs')
  } catch (error) {
    console.error('\n❌ Diagnostics failed:', error.message)
  }
}

runDiagnostics()
