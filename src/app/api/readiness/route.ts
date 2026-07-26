import { NextResponse } from 'next/server';

import { resolveTenantApiBaseUrl, resolveTenantApiTimeout } from '@/features/auth/infrastructure';

export const dynamic = 'force-dynamic';

function readinessResponse(status: 'ready' | 'not-ready', upstream: 'ready' | 'unavailable') {
  return NextResponse.json(
    {
      status,
      service: 'lume-tenant-web',
      dependencies: {
        tenantApi: upstream,
      },
    },
    {
      status: status === 'ready' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

export async function GET() {
  let tenantApiUrl: string;
  let timeoutMs: number;

  try {
    tenantApiUrl = resolveTenantApiBaseUrl(process.env.LUME_TENANT_API_URL);
    timeoutMs = resolveTenantApiTimeout(process.env.LUME_TENANT_API_TIMEOUT_MS);
  } catch {
    return readinessResponse('not-ready', 'unavailable');
  }

  try {
    const response = await fetch(`${tenantApiUrl}/health/ready`, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });

    return response.ok
      ? readinessResponse('ready', 'ready')
      : readinessResponse('not-ready', 'unavailable');
  } catch {
    return readinessResponse('not-ready', 'unavailable');
  }
}
