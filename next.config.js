/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }]
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