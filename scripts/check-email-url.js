/**
 * Test script to check what URL the email system is actually using
 * Run this in Vercel logs or locally to verify configuration
 */

// Simulate what the email system sees
console.log('='.repeat(70))
console.log('EMAIL URL CONFIGURATION CHECK')
console.log('='.repeat(70))

console.log('\n📋 Environment Variables Check:')
console.log('  NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ NOT SET')
console.log('  VERCEL_URL:', process.env.VERCEL_URL || '❌ NOT SET')
console.log('  NODE_ENV:', process.env.NODE_ENV || 'development')

// Calculate what BASE_URL will be used
const BASE_URL = process.env.NEXTAUTH_URL
  ? process.env.NEXTAUTH_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

console.log('\n🔧 Calculated BASE_URL for emails:')
console.log(`   ${BASE_URL}`)

console.log('\n✅ What email verification links will look like:')
console.log(`   ${BASE_URL}/verify-email?token=...`)

console.log('\n' + '='.repeat(70))

if (BASE_URL.includes('youknowgurus-projects')) {
  console.log('\n❌ PROBLEM: Using preview deployment URL!')
  console.log('\nSOLUTION:')
  console.log('  1. Go to Vercel Dashboard → Settings → Environment Variables')
  console.log('  2. Make sure NEXTAUTH_URL is set to: https://dhisum-tseyig.vercel.app')
  console.log('  3. Redeploy the application')
  console.log('  4. Wait for deployment to complete before testing')
} else if (process.env.NEXTAUTH_URL) {
  console.log('\n✅ CORRECT: Using NEXTAUTH_URL (stable production URL)')
  console.log('   Email links should work properly!')
} else if (process.env.VERCEL_URL && !process.env.VERCEL_URL.includes('youknowgurus-projects')) {
  console.log('\n✅ ACCEPTABLE: Using VERCEL_URL (production deployment)')
  console.log('   This is fine for production, but NEXTAUTH_URL is better')
} else {
  console.log('\n⚠️  WARNING: Not set up correctly')
  console.log('   Set NEXTAUTH_URL in Vercel environment variables')
}

console.log('\n' + '='.repeat(70))
