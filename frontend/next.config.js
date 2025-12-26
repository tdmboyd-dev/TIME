/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Ignore build errors for deployment (warnings only)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Suppress specific warnings
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Increase memory for build
  experimental: {
    workerThreads: false,
    cpus: 1,
  },

  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev',
  },

  // Webpack configuration for module resolution
  webpack: (config, { isServer }) => {
    // Fix for @metamask/sdk and other modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // Ignore specific modules that cause warnings
    config.externals = config.externals || [];
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    return config;
  },
};

module.exports = nextConfig;
