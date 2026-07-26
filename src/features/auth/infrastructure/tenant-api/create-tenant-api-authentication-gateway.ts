import 'server-only';

import type { AuthenticationGateway } from '../../application';
import {
  TenantApiAuthenticationGateway,
  resolveTenantApiBaseUrl,
  resolveTenantApiTimeout,
} from './tenant-api-authentication-gateway';

export function createTenantApiAuthenticationGateway(): AuthenticationGateway {
  return new TenantApiAuthenticationGateway({
    baseUrl: resolveTenantApiBaseUrl(process.env.LUME_TENANT_API_URL),
    timeoutMs: resolveTenantApiTimeout(process.env.LUME_TENANT_API_TIMEOUT_MS),
  });
}
