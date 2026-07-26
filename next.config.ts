import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  logging: {
    serverFunctions: false,
  },
  transpilePackages: ['jose'],
};

export default nextConfig;
