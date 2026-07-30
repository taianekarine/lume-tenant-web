import { z } from 'zod';

export const newPasswordSchema = z
  .string()
  .min(12, 'A nova senha deve ter ao menos 12 caracteres.')
  .max(72)
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
    'Inclua maiúscula, minúscula, número e símbolo.',
  );

export const passwordChangeSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmation: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    message: 'As senhas não conferem.',
    path: ['confirmation'],
  });

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

export const passwordChangeActionSchema = z.object({
  token: z.string().trim().min(1, 'O link para criar a senha é inválido ou expirou.'),
  newPassword: newPasswordSchema,
});
