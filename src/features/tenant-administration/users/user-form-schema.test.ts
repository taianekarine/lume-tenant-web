import { userFormSchema } from './user-form-schema';

describe('userFormSchema', () => {
  it('accepts the four requested identity fields and tenant assignments', () => {
    expect(
      userFormSchema.safeParse({
        name: 'Taiane Karine',
        username: 'taiane',
        email: 'taiane@example.com',
        password: 'SenhaInicial@2026',
        isAdministrator: false,
        departments: ['operations'],
        permissionCodes: ['dashboard:view'],
      }).success,
    ).toBe(true);
  });

  it('does not accept a CPF field as part of the form contract', () => {
    const parsed = userFormSchema.safeParse({
      name: 'Taiane Karine',
      username: 'taiane',
      email: 'taiane@example.com',
      password: 'SenhaInicial@2026',
      cpf: '52998224725',
      isAdministrator: false,
      departments: ['operations'],
      permissionCodes: ['dashboard:view'],
    });
    expect(parsed.success).toBe(false);
  });

  it('requires the username to contain at least one letter', () => {
    const parsed = userFormSchema.safeParse({
      name: 'Taiane Karine',
      username: '123456',
      email: 'taiane@example.com',
      password: 'SenhaInicial@2026',
      isAdministrator: false,
      departments: ['operations'],
      permissionCodes: ['dashboard:view'],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['username'],
        message: 'O nome de usuário deve conter ao menos uma letra.',
      }),
    );
  });

  it('requires a department but allows only the common implicit permissions', () => {
    const identity = {
      name: 'Taiane Karine',
      username: 'taiane',
      email: 'taiane@example.com',
      password: 'SenhaInicial@2026',
      isAdministrator: false,
    };

    expect(
      userFormSchema.safeParse({
        ...identity,
        departments: [],
        permissionCodes: ['dashboard:view'],
      }).success,
    ).toBe(false);
    expect(
      userFormSchema.safeParse({
        ...identity,
        departments: ['operations'],
        permissionCodes: [],
      }).success,
    ).toBe(true);
  });

  it('does not allow creating an administrator through the Tenant Web', () => {
    const parsed = userFormSchema.safeParse({
      name: 'Taiane Karine',
      username: 'taiane',
      email: 'taiane@example.com',
      password: 'SenhaInicial@2026',
      isAdministrator: true,
      departments: [],
      permissionCodes: [],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(
      'Contas administradoras não podem ser criadas pelo Tenant Web.',
    );
  });
});
