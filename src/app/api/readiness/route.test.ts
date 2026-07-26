/** @jest-environment node */

import { GET } from './route';

const originalFetch = global.fetch;
const originalTenantApiUrl = process.env.LUME_TENANT_API_URL;
const originalTenantApiTimeout = process.env.LUME_TENANT_API_TIMEOUT_MS;

describe('GET /api/readiness', () => {
  beforeEach(() => {
    process.env.LUME_TENANT_API_URL = 'http://tenant-api.test/api/v1';
    process.env.LUME_TENANT_API_TIMEOUT_MS = '1500';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalTenantApiUrl === undefined) delete process.env.LUME_TENANT_API_URL;
    else process.env.LUME_TENANT_API_URL = originalTenantApiUrl;
    if (originalTenantApiTimeout === undefined) delete process.env.LUME_TENANT_API_TIMEOUT_MS;
    else process.env.LUME_TENANT_API_TIMEOUT_MS = originalTenantApiTimeout;
    jest.restoreAllMocks();
  });

  it('is ready only when the Tenant API readiness endpoint is healthy', async () => {
    jest.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ready',
      dependencies: { tenantApi: 'ready' },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://tenant-api.test/api/v1/health/ready',
      expect.objectContaining({
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it.each([
    [
      'the API rejects readiness',
      () => jest.mocked(global.fetch).mockResolvedValue({ ok: false } as Response),
    ],
    [
      'the API is unreachable',
      () => jest.mocked(global.fetch).mockRejectedValue(new Error('offline')),
    ],
  ])('returns 503 when %s', async (_scenario, arrange) => {
    arrange();

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'not-ready',
      dependencies: { tenantApi: 'unavailable' },
    });
  });

  it('returns 503 without contacting the network when configuration is invalid', async () => {
    delete process.env.LUME_TENANT_API_URL;

    const response = await GET();

    expect(response.status).toBe(503);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
