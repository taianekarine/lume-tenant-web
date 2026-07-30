import { z } from 'zod';

const userAssignmentFields = {
  name: z.string().trim().min(3, 'Informe o nome completo.').max(120),
  email: z.string().trim().email('Informe um e-mail válido.').max(254),
  isAdministrator: z.boolean(),
  departments: z.array(z.string()),
  permissionCodes: z.array(z.string()),
} as const;

function requireDepartmentForStandardUser(
  input: { readonly isAdministrator: boolean; readonly departments: readonly string[] },
  context: z.RefinementCtx,
) {
  if (!input.isAdministrator && input.departments.length === 0) {
    context.addIssue({
      code: 'custom',
      message: 'Selecione ao menos um departamento.',
      path: ['departments'],
    });
  }
}

export const userFormSchema = z
  .object({
    ...userAssignmentFields,
    isAdministrator: z.literal(false, {
      error: 'Contas administradoras não podem ser criadas pelo Tenant Web.',
    }),
    username: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9._-]{3,40}$/, 'Use de 3 a 40 letras, números, ponto, hífen ou sublinhado.')
      .refine(
        (username) => /[a-zA-Z]/.test(username),
        'O nome de usuário deve conter ao menos uma letra.',
      ),
    password: z
      .string()
      .min(12, 'A senha inicial deve ter ao menos 12 caracteres.')
      .max(72)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
        'Inclua maiúscula, minúscula, número e símbolo.',
      ),
  })
  .strict()
  .superRefine(requireDepartmentForStandardUser);

export const userEditorFormSchema = z
  .object(userAssignmentFields)
  .strict()
  .superRefine(requireDepartmentForStandardUser);

export type UserFormValues = z.infer<typeof userFormSchema>;
export type UserEditorFormValues = z.infer<typeof userEditorFormSchema>;
