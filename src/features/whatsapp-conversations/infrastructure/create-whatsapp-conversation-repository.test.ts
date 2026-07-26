/** @jest-environment node */

import { createWhatsAppConversationRepository } from './create-whatsapp-conversation-repository';

describe('createWhatsAppConversationRepository', () => {
  const originalDataSource = process.env.LUME_TENANT_WHATSAPP_DATA_SOURCE;

  afterEach(() => {
    if (originalDataSource === undefined) {
      delete process.env.LUME_TENANT_WHATSAPP_DATA_SOURCE;
    } else {
      process.env.LUME_TENANT_WHATSAPP_DATA_SOURCE = originalDataSource;
    }
  });

  it('forbids the WhatsApp mock in production', async () => {
    process.env.LUME_TENANT_WHATSAPP_DATA_SOURCE = 'mock';

    await expect(createWhatsAppConversationRepository('token', 'production')).rejects.toThrow(
      'WhatsApp mock data cannot be enabled in production.',
    );
  });

  it('uses the API by default and requires an authenticated access token', async () => {
    delete process.env.LUME_TENANT_WHATSAPP_DATA_SOURCE;

    await expect(createWhatsAppConversationRepository()).rejects.toThrow(
      'An authenticated Tenant API access token is required.',
    );
  });
});
