import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  logging: {
    serverFunctions: false,
  },
  experimental: {
    // The authenticated BFF streams WhatsApp export archives to the Tenant API.
    // Keep this slightly above the API's 512 MiB archive limit so multipart
    // framing is not truncated by Next.js' 10 MiB proxy default.
    proxyClientMaxBodySize: '513mb',
    serverActions: {
      bodySizeLimit: '51mb',
    },
  },
  transpilePackages: ['jose'],
};

export default nextConfig;
