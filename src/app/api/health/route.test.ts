/** @jest-environment node */

import { GET } from './route';

describe('GET /api/health', () => {
  it('returns a cache-free liveness response', async () => {
    const response = GET();

    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      service: 'lume-tenant-web',
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
