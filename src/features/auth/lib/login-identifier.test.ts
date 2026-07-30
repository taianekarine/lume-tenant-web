import { normalizeLoginIdentifier, validateLoginIdentifier } from './login-identifier';

describe('normalizeLoginIdentifier', () => {
  it('identifies and trims a username', () => {
    expect(normalizeLoginIdentifier('  taiane.karine  ')).toEqual({
      type: 'username',
      value: 'taiane.karine',
    });
  });

  it('identifies and normalizes an e-mail', () => {
    expect(normalizeLoginIdentifier('  TAIANE@EXAMPLE.COM  ')).toEqual({
      type: 'email',
      value: 'taiane@example.com',
    });
  });

  it('marks numeric documents as unsupported login identifiers', () => {
    expect(normalizeLoginIdentifier('529.982.247-25')).toEqual({
      type: 'unsupported-document',
      value: '529.982.247-25',
    });
  });
});

describe('validateLoginIdentifier', () => {
  it.each([
    { type: 'username' as const, value: 'taiane.karine' },
    { type: 'email' as const, value: 'taiane@example.com' },
  ])('accepts the supported identifier $value', (identifier) => {
    expect(validateLoginIdentifier(identifier)).toEqual({
      isValid: true,
      message: null,
    });
  });

  it('rejects an empty identifier', () => {
    expect(validateLoginIdentifier({ type: 'username', value: '' })).toEqual({
      isValid: false,
      message: 'Informe seu usuário ou e-mail.',
    });
  });

  it('rejects an invalid e-mail', () => {
    expect(validateLoginIdentifier({ type: 'email', value: 'taiane@' })).toEqual({
      isValid: false,
      message: 'Informe um e-mail válido.',
    });
  });

  it('rejects numeric documents', () => {
    expect(
      validateLoginIdentifier({
        type: 'unsupported-document',
        value: '529.982.247-25',
      }),
    ).toEqual({
      isValid: false,
      message: 'Informe um usuário ou e-mail válido.',
    });
  });
});
