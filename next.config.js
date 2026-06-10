/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use Turbopack with proper configuration to prevent compilation loops
  turbopack: {},

  serverExternalPackages: ['mongoose'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'download.sitejinda.com',
      },
    ],
  },
  // Skip type checking during build (Next.js 16 internal type issue)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enable static export for Electron
  output: process.env.NEXT_EXPORT === 'true' ? 'export' : undefined,
  // Only include API routes in static export
  // Pages will be served separately from Electron

  async headers() {
    return [
      {
        // matching all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          // SECURITY: Never use '*' with credentials. Use specific origin.
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN || 'https://site-jinda.vercel.app' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
