import { passwordRecoverySchema } from './password-recovery-schema';

describe('passwordRecoverySchema', () => {
  it.each(['taiane.karine', 'taiane@example.com'])(
    'accepts the supported identifier %s',
    (identifier) => {
      expect(passwordRecoverySchema.safeParse({ identifier }).success).toBe(true);
    },
  );

  it('rejects empty and numeric document identifiers', () => {
    expect(passwordRecoverySchema.safeParse({ identifier: '' }).success).toBe(false);
    expect(passwordRecoverySchema.safeParse({ identifier: '111.111.111-11' }).success).toBe(false);
  });
});
