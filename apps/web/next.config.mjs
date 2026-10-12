/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@stellar-learn/ui',
    '@stellar-learn/game-engine',
    '@stellar-learn/stellar',
    '@stellar-learn/content',
  ],
  experimental: {
    // Enable server actions. Same-origin is allowed by default; these are the
    // *extra* trusted origins. Localhost for dev, plus the deployed domain(s)
    // so production and Vercel preview URLs keep working behind proxies.
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, ''),
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
        process.env.VERCEL_URL,
      ].filter(Boolean),
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
}

export default nextConfig
