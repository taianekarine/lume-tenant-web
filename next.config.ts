import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  logging: {
    serverFunctions: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '51mb',
    },
  },
  transpilePackages: ['jose'],
};

export default nextConfig;
