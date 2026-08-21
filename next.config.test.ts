import nextConfig from './next.config';

describe('Next.js upload proxy configuration', () => {
  it('forwards full Android WhatsApp databases up to the API limit', () => {
    expect(nextConfig.experimental?.proxyClientMaxBodySize).toBe('2048mb');
  });
});
