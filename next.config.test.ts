import nextConfig from './next.config';

describe('Next.js upload proxy configuration', () => {
  it('forwards WhatsApp archives up to the limit accepted by the Tenant API', () => {
    expect(nextConfig.experimental?.proxyClientMaxBodySize).toBe('513mb');
  });
});
