import { z } from 'zod';

export const supportFormSchema = z.object({
  subject: z.string().trim().min(5, 'Resuma o assunto em pelo menos 5 caracteres.').max(120),
  message: z
    .string()
    .trim()
    .min(20, 'Descreva a solicitação em pelo menos 20 caracteres.')
    .max(4_000),
});

export type SupportFormData = z.infer<typeof supportFormSchema>;
