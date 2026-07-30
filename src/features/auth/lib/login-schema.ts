import { z } from 'zod';

import { normalizeLoginIdentifier, validateLoginIdentifier } from './login-identifier';

export const loginSchema = z
  .object({
    identifier: z.string().trim().min(1, 'Informe seu usuário ou e-mail.'),

    password: z.string().min(1, 'Informe sua senha.'),

    remember: z.boolean(),
  })
  .superRefine((values, context) => {
    if (!values.identifier) {
      return;
    }

    const normalizedIdentifier = normalizeLoginIdentifier(values.identifier);

    const identifierValidation = validateLoginIdentifier(normalizedIdentifier);

    if (!identifierValidation.isValid) {
      context.addIssue({
        code: 'custom',
        path: ['identifier'],
        message: identifierValidation.message ?? 'Informe um usuário ou e-mail válido.',
      });
    }
  });

export type LoginFormData = z.infer<typeof loginSchema>;
