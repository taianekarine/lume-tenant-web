import 'server-only';

import {
  resolveTenantApiBaseUrl,
  resolveTenantApiTimeout,
} from '@/features/auth/infrastructure';

import { LumeApiWhatsAppMediaContentGateway } from './tenant-api-whatsapp-media-content';

export function createWhatsAppMediaContentGateway(
  accessToken: string,
): LumeApiWhatsAppMediaContentGateway {
  if (!accessToken.trim()) {
    throw new Error('An authenticated Tenant API access token is required.');
  }

  return new LumeApiWhatsAppMediaContentGateway(
    resolveTenantApiBaseUrl(process.env.LUME_TENANT_API_URL),
    accessToken,
    fetch,
    Math.max(
      30_000,
      resolveTenantApiTimeout(process.env.LUME_TENANT_API_TIMEOUT_MS),
    ),
  );
}
