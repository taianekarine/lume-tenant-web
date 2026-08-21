import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  logging: {
    serverFunctions: false,
  },
  experimental: {
    // The authenticated BFF streams individual exports and full Android
    // databases to the Tenant API. The API still enforces the authoritative
    // per-file limit and decrypts the database in private storage.
    proxyClientMaxBodySize: '2048mb',
    serverActions: {
      bodySizeLimit: '51mb',
    },
  },
  transpilePackages: ['jose'],
};

export default nextConfig;
