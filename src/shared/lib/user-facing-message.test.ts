import { userFacingMessage } from './user-facing-message';

describe('userFacingMessage', () => {
  const fallback = 'Não foi possível concluir a operação.';

  it.each([
    'Tenant API indisponível.',
    'A resposta da API retornou HTTP 500.',
    'O n8n retornou uma falha.',
    'Evolution não respondeu.',
    'Falha no provedor configurado.',
    'Código do erro: SERVICE_UNAVAILABLE',
    'PostgreSQL indisponível.',
  ])('substitui detalhes técnicos em %s', (message) => {
    expect(userFacingMessage(message, fallback)).toBe(fallback);
  });

  it('mantém uma orientação segura e compreensível', () => {
    expect(userFacingMessage('Revise os campos e tente novamente.', fallback)).toBe(
      'Revise os campos e tente novamente.',
    );
  });
});
