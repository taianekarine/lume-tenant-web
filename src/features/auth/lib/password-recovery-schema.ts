import { z } from 'zod';

import { normalizeLoginIdentifier, validateLoginIdentifier } from './login-identifier';

export const passwordRecoverySchema = z
  .object({
    identifier: z.string().trim().min(1, 'Informe seu usuário ou e-mail.'),
  })
  .superRefine((values, context) => {
    if (!values.identifier) return;

    const validation = validateLoginIdentifier(normalizeLoginIdentifier(values.identifier));
    if (!validation.isValid) {
      context.addIssue({
        code: 'custom',
        path: ['identifier'],
        message: validation.message ?? 'Informe um usuário ou e-mail válido.',
      });
    }
  });

export type PasswordRecoveryFormData = z.infer<typeof passwordRecoverySchema>;
