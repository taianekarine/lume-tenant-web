import 'server-only';

import { resolveTenantApiBaseUrl, resolveTenantApiTimeout } from '@/features/auth/infrastructure';

import type { RoutingGateway } from '../application';
import { TenantApiRoutingGateway } from './tenant-api-routing-gateway';

export function createRoutingGateway(accessToken: string): RoutingGateway {
  return new TenantApiRoutingGateway(
    resolveTenantApiBaseUrl(process.env.LUME_TENANT_API_URL),
    accessToken,
    fetch,
    resolveTenantApiTimeout(process.env.LUME_TENANT_API_TIMEOUT_MS),
  );
}
