import { supportFormSchema } from './support-schema';

describe('supportFormSchema', () => {
  it('requires enough context for a useful support request', () => {
    expect(
      supportFormSchema.safeParse({
        subject: 'Erro no acesso',
        message: 'Ao acessar o painel, recebo uma mensagem inesperada.',
      }).success,
    ).toBe(true);
    expect(supportFormSchema.safeParse({ subject: 'Erro', message: 'Falhou.' }).success).toBe(
      false,
    );
  });
});
