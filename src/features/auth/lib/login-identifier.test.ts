import { normalizeLoginIdentifier, validateLoginIdentifier } from './login-identifier';

describe('normalizeLoginIdentifier', () => {
  it('deve identificar um nome de usuário', () => {
    expect(normalizeLoginIdentifier('taiane.karine')).toEqual({
      type: 'username',
      value: 'taiane.karine',
    });
  });

  it('deve remover espaços externos do nome de usuário', () => {
    expect(normalizeLoginIdentifier('  taiane.karine  ')).toEqual({
      type: 'username',
      value: 'taiane.karine',
    });
  });

  it.each(['comercial.teste', 'operacoes.teste'])(
    'não deve confundir o nome de usuário %s com um CNPJ',
    (username) => {
      expect(normalizeLoginIdentifier(username)).toEqual({
        type: 'username',
        value: username,
      });
    },
  );

  it('deve identificar e normalizar um CPF formatado', () => {
    expect(normalizeLoginIdentifier('529.982.247-25')).toEqual({
      type: 'cpf',
      value: '52998224725',
    });
  });

  it('deve identificar e normalizar um CPF sem máscara', () => {
    expect(normalizeLoginIdentifier('52998224725')).toEqual({
      type: 'cpf',
      value: '52998224725',
    });
  });

  it('deve bloquear um CNPJ formatado enquanto o acesso externo não existe', () => {
    expect(normalizeLoginIdentifier('04.252.011/0001-10')).toEqual({
      type: 'unsupported-client-document',
      value: '04252011000110',
    });
  });

  it('deve bloquear um CNPJ sem máscara enquanto o acesso externo não existe', () => {
    expect(normalizeLoginIdentifier('04252011000110')).toEqual({
      type: 'unsupported-client-document',
      value: '04252011000110',
    });
  });
});

describe('validateLoginIdentifier', () => {
  it('deve aceitar um nome de usuário preenchido', () => {
    expect(
      validateLoginIdentifier({
        type: 'username',
        value: 'taiane.karine',
      }),
    ).toEqual({
      isValid: true,
      message: null,
    });
  });

  it('deve rejeitar um identificador vazio', () => {
    expect(
      validateLoginIdentifier({
        type: 'username',
        value: '',
      }),
    ).toEqual({
      isValid: false,
      message: 'Informe seu usuário, e-mail ou CPF.',
    });
  });

  it('deve aceitar um CPF válido', () => {
    expect(
      validateLoginIdentifier({
        type: 'cpf',
        value: '52998224725',
      }),
    ).toEqual({
      isValid: true,
      message: null,
    });
  });

  it('deve rejeitar um CPF inválido', () => {
    expect(
      validateLoginIdentifier({
        type: 'cpf',
        value: '11111111111',
      }),
    ).toEqual({
      isValid: false,
      message: 'Informe um CPF válido.',
    });
  });

  it('deve rejeitar CNPJ mesmo quando o documento é válido', () => {
    expect(
      validateLoginIdentifier({
        type: 'unsupported-client-document',
        value: '04252011000110',
      }),
    ).toEqual({
      isValid: false,
      message: 'O acesso por CNPJ ainda não está disponível.',
    });
  });

  it('deve rejeitar também um CNPJ inválido', () => {
    expect(
      validateLoginIdentifier({
        type: 'unsupported-client-document',
        value: '11111111111111',
      }),
    ).toEqual({
      isValid: false,
      message: 'O acesso por CNPJ ainda não está disponível.',
    });
  });
});
