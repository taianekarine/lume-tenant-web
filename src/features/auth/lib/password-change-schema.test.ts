import { passwordChangeSchema } from './password-change-schema';

describe('passwordChangeSchema', () => {
  it('requires a strong matching confirmation', () => {
    expect(
      passwordChangeSchema.safeParse({
        newPassword: 'NovaSenhaSegura@2026',
        confirmation: 'NovaSenhaSegura@2026',
      }).success,
    ).toBe(true);
    expect(
      passwordChangeSchema.safeParse({
        newPassword: 'NovaSenhaSegura@2026',
        confirmation: 'OutraSenhaSegura@2026',
      }).success,
    ).toBe(false);
  });
});
