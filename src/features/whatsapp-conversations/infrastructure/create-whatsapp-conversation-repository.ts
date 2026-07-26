import 'server-only';

import { resolveTenantApiBaseUrl, resolveTenantApiTimeout } from '@/features/auth/infrastructure';

import type { WhatsAppConversationRepository } from '../application';
import { LumeApiWhatsAppConversationRepository } from './tenant-api-whatsapp-conversation-repository';

export async function createWhatsAppConversationRepository(
  accessToken?: string,
  nodeEnvironment = process.env.NODE_ENV,
): Promise<WhatsAppConversationRepository> {
  const dataSource = process.env.LUME_TENANT_WHATSAPP_DATA_SOURCE?.trim() || 'api';

  if (dataSource === 'mock') {
    if (nodeEnvironment === 'production') {
      throw new Error('WhatsApp mock data cannot be enabled in production.');
    }

    const { MockWhatsAppConversationRepository } = await import('./mock');
    return new MockWhatsAppConversationRepository();
  }

  if (dataSource !== 'api') {
    throw new Error('LUME_TENANT_WHATSAPP_DATA_SOURCE must be "api" or "mock".');
  }

  if (!accessToken?.trim()) {
    throw new Error('An authenticated Tenant API access token is required.');
  }

  return new LumeApiWhatsAppConversationRepository(
    resolveTenantApiBaseUrl(process.env.LUME_TENANT_API_URL),
    accessToken,
    fetch,
    resolveTenantApiTimeout(process.env.LUME_TENANT_API_TIMEOUT_MS),
  );
}
