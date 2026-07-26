import 'server-only';

import { resolveTenantApiBaseUrl, resolveTenantApiTimeout } from '@/features/auth/infrastructure';

import type { TenantAdministrationGateway } from '../application';
import { TenantApiAdministrationGateway } from './tenant-api-administration-gateway';

export function createTenantAdministrationGateway(
  accessToken: string,
): TenantAdministrationGateway {
  return new TenantApiAdministrationGateway(
    resolveTenantApiBaseUrl(process.env.LUME_TENANT_API_URL),
    accessToken,
    fetch,
    resolveTenantApiTimeout(process.env.LUME_TENANT_API_TIMEOUT_MS),
  );
}
