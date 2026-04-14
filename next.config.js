/** @type {import('next').NextConfig} */
module.exports = {
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 10,
  },
  images: {
    remotePatterns: []
  },
  // Compress responses
  compress: true,
  // Aggressive static asset caching
  async headers() {
    return [
      {
        source: '/images/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
}
