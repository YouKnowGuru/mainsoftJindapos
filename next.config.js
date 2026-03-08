/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'download.dhisumtseyig.com',
      },
    ],
  },
}

module.exports = nextConfig
