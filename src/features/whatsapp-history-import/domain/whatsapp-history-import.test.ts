import {
  WHATSAPP_HISTORY_DEPARTMENT_LABELS,
  WHATSAPP_HISTORY_REVIEW_FILTER_LABELS,
  WHATSAPP_HISTORY_STATE_LABELS,
  whatsAppHistoryDivergenceListSchema,
} from './whatsapp-history-import';

describe('WhatsApp history import labels', () => {
  it('keeps internal review values out of the interface', () => {
    expect(WHATSAPP_HISTORY_REVIEW_FILTER_LABELS).toEqual({
      'needs-review': 'Pendentes de revisão',
      ready: 'Revisados',
      all: 'Todos',
    });
  });

  it('provides humanized labels for every state and department', () => {
    expect(Object.values(WHATSAPP_HISTORY_STATE_LABELS)).not.toContain('human-active');
    expect(Object.values(WHATSAPP_HISTORY_DEPARTMENT_LABELS)).not.toContain('personnel-department');
    expect(WHATSAPP_HISTORY_STATE_LABELS['human-active']).toBe('Atendimento humano ativo');
    expect(WHATSAPP_HISTORY_DEPARTMENT_LABELS['personnel-department']).toBe('Departamento Pessoal');
  });

  it('validates the human review contract for divergent messages', () => {
    expect(
      whatsAppHistoryDivergenceListSchema.parse({
        total: 1,
        pending: 1,
        items: [
          {
            externalMessageId: 'message-1',
            externalConversationId: 'conversation-1',
            contactName: 'Contato',
            phoneE164: '5534999999999',
            senderName: 'Contato',
            occurredAt: '2026-08-19T12:00:00.000Z',
            existing: {
              direction: 'inbound',
              deliveryStatus: 'received',
              kind: 'text',
              text: 'Mensagem atual',
              occurredAt: '2026-08-19T12:00:00.000Z',
              hasMedia: false,
            },
            backup: {
              direction: 'inbound',
              deliveryStatus: 'received',
              kind: 'text',
              text: 'Mensagem do backup',
              occurredAt: '2026-08-19T12:00:00.000Z',
              hasMedia: false,
            },
            resolution: null,
            decidedByUsername: null,
            decidedAt: null,
          },
        ],
      }),
    ).toMatchObject({ total: 1, pending: 1 });
  });
});
