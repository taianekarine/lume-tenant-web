import {
  WHATSAPP_HISTORY_DEPARTMENT_LABELS,
  WHATSAPP_HISTORY_REVIEW_FILTER_LABELS,
  WHATSAPP_HISTORY_STATE_LABELS,
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
});
