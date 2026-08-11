'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { TenantAdministrationError } from '../application';
import { executeAuthenticatedTenantMutation } from '../server';

const userAssignmentFields = {
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(254),
  isAdministrator: z.boolean(),
  documentAccessMode: z.enum(['standard', 'document-portal']).optional(),
  departments: z.array(z.string().min(1)),
  permissionCodes: z.array(z.string().min(1)),
  jobTitle: z.enum(['Administrativo', 'Geral', 'Motorista']).optional(),
  maritalStatus: z
    .enum(['single', 'married', 'stable-union', 'divorced', 'widowed', 'not-informed'])
    .optional(),
  militaryDocumentStatus: z
    .enum(['applicable', 'not-applicable', 'pending-confirmation'])
    .optional(),
  dependents: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(120),
        birthDate: z.string().date(),
        relationship: z.string().trim().max(60).optional(),
      }),
    )
    .optional(),
} as const;

function requireDepartmentForStandardUser(
  input: {
    readonly isAdministrator: boolean;
    readonly documentAccessMode?: 'standard' | 'document-portal';
    readonly departments: readonly string[];
  },
  context: z.RefinementCtx,
) {
  if (
    !input.isAdministrator &&
    input.documentAccessMode !== 'document-portal' &&
    input.departments.length === 0
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Selecione ao menos um departamento.',
      path: ['departments'],
    });
  }
}

const userBaseSchema = z.object(userAssignmentFields).superRefine(requireDepartmentForStandardUser);
const createUserSchema = z
  .object({
    ...userAssignmentFields,
    isAdministrator: z.literal(false, {
      error: 'Contas administradoras não podem ser criadas pelo Tenant Web.',
    }),
    username: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9._-]{3,40}$/)
      .refine(
        (username) => /[a-zA-Z]/.test(username),
        'O nome de usuário deve conter ao menos uma letra.',
      ),
    password: z
      .string()
      .min(12)
      .max(72)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/),
    requestDocuments: z.boolean().default(false),
  })
  .superRefine((input, context) => {
    requireDepartmentForStandardUser(input, context);
    if (input.documentAccessMode === 'document-portal' && !input.requestDocuments) {
      context.addIssue({
        code: 'custom',
        message: 'A solicitação de documentação é obrigatória para candidatos.',
        path: ['requestDocuments'],
      });
    }
  });

function normalizeAdministratorAssignments<
  T extends {
    readonly isAdministrator: boolean;
    readonly departments: readonly string[];
    readonly permissionCodes: readonly string[];
  },
>(input: T): T {
  return input.isAdministrator ? { ...input, departments: [], permissionCodes: [] } : input;
}

function withoutAdministratorMutation(input: z.infer<typeof userBaseSchema>) {
  const employeeProfile = {
    ...(input.jobTitle === undefined ? {} : { jobTitle: input.jobTitle }),
    ...(input.maritalStatus === undefined ? {} : { maritalStatus: input.maritalStatus }),
    ...(input.militaryDocumentStatus === undefined
      ? {}
      : { militaryDocumentStatus: input.militaryDocumentStatus }),
    ...(input.dependents === undefined ? {} : { dependents: input.dependents }),
  };
  if (input.isAdministrator) {
    return {
      name: input.name,
      email: input.email,
      ...employeeProfile,
    };
  }

  return {
    name: input.name,
    email: input.email,
    documentAccessMode: input.documentAccessMode,
    departments: input.departments,
    permissionCodes: input.permissionCodes,
    ...employeeProfile,
  };
}
function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function formStrings(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function formBoolean(formData: FormData, name: string): boolean {
  const value = formData.get(name);
  return value === 'true' || value === 'on';
}

function actionFailureDestination(path: string, error: unknown): never {
  if (error instanceof TenantAdministrationError && error.code === 'unauthorized') {
    redirect('/auth/session-expired');
  }

  const message =
    error instanceof TenantAdministrationError
      ? error.message
      : 'Não foi possível concluir a operação.';
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createTenantUserAction(formData: FormData): Promise<void> {
  const parsed = createUserSchema.safeParse({
    name: formString(formData, 'name'),
    username: formString(formData, 'username'),
    email: formString(formData, 'email'),
    password: formString(formData, 'password'),
    requestDocuments: formBoolean(formData, 'requestDocuments'),
    isAdministrator: formBoolean(formData, 'isAdministrator'),
    documentAccessMode:
      formString(formData, 'documentAccessMode') === 'document-portal'
        ? 'document-portal'
        : 'standard',
    departments: formStrings(formData, 'departments'),
    permissionCodes: formStrings(formData, 'permissionCodes'),
    jobTitle: formString(formData, 'jobTitle') || undefined,
    maritalStatus: formString(formData, 'maritalStatus') || 'not-informed',
    militaryDocumentStatus:
      formString(formData, 'militaryDocumentStatus') || 'pending-confirmation',
    dependents: [],
  });

  if (!parsed.success) {
    redirect('/users?error=Revise os dados do novo usuário.');
  }

  try {
    await executeAuthenticatedTenantMutation((gateway) =>
      gateway.createUser({
        ...normalizeAdministratorAssignments(parsed.data),
        ...(parsed.data.requestDocuments ? { initialDocumentRequestCommandId: randomUUID() } : {}),
      }),
    );
  } catch (error) {
    actionFailureDestination('/users', error);
  }

  revalidatePath('/users');
  redirect('/users?success=Usuário criado com sucesso.');
}

export async function updateTenantUserAction(userId: string, formData: FormData): Promise<void> {
  const parsed = userBaseSchema.safeParse({
    name: formString(formData, 'name'),
    email: formString(formData, 'email'),
    isAdministrator: formBoolean(formData, 'isAdministrator'),
    documentAccessMode:
      formString(formData, 'documentAccessMode') === 'document-portal'
        ? 'document-portal'
        : 'standard',
    departments: formStrings(formData, 'departments'),
    permissionCodes: formStrings(formData, 'permissionCodes'),
    jobTitle: formString(formData, 'jobTitle') || undefined,
    maritalStatus: formString(formData, 'maritalStatus') || 'not-informed',
    militaryDocumentStatus:
      formString(formData, 'militaryDocumentStatus') || 'pending-confirmation',
    dependents: [],
  });

  if (!parsed.success) {
    redirect(`/users/${userId}?error=Revise os dados do usuário.`);
  }

  try {
    await executeAuthenticatedTenantMutation((gateway) =>
      gateway.updateUser(userId, withoutAdministratorMutation(parsed.data)),
    );
  } catch (error) {
    actionFailureDestination(`/users/${userId}`, error);
  }

  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
  redirect(`/users/${userId}?success=Usuário atualizado com sucesso.`);
}

export async function setTenantUserActiveAction(userId: string, isActive: boolean): Promise<void> {
  try {
    await executeAuthenticatedTenantMutation((gateway) =>
      gateway.updateUserStatus(userId, { status: isActive ? 'active' : 'inactive' }),
    );
  } catch (error) {
    actionFailureDestination('/users', error);
  }

  revalidatePath('/users');
  redirect(`/users?success=Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso.`);
}

export type TenantUserFormResult =
  | {
      readonly success: true;
      readonly message: string;
    }
  | {
      readonly success: false;
      readonly message: string;
      readonly errorCode: string;
    };

function tenantUserActionResult(error: unknown, fallback: string): TenantUserFormResult {
  if (error instanceof TenantAdministrationError) {
    return { success: false, message: error.message, errorCode: error.publicCode };
  }

  return { success: false, message: fallback, errorCode: 'UNEXPECTED_ERROR' };
}

export async function createTenantUserFormAction(input: unknown): Promise<TenantUserFormResult> {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Revise os dados do novo usuário.',
      errorCode: 'VALIDATION_ERROR',
    };
  }

  try {
    await executeAuthenticatedTenantMutation((gateway) =>
      gateway.createUser({
        ...normalizeAdministratorAssignments(parsed.data),
        ...(parsed.data.requestDocuments ? { initialDocumentRequestCommandId: randomUUID() } : {}),
      }),
    );
  } catch (error) {
    return tenantUserActionResult(error, 'Não foi possível criar o usuário.');
  }

  revalidatePath('/users');
  return {
    success: true,
    message: 'Usuário criado. No primeiro acesso, ele deverá substituir a senha inicial.',
  };
}

export async function updateTenantUserFormAction(
  userId: string,
  input: unknown,
): Promise<TenantUserFormResult> {
  const parsed = userBaseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Revise os dados do usuário.',
      errorCode: 'VALIDATION_ERROR',
    };
  }

  try {
    await executeAuthenticatedTenantMutation((gateway) =>
      gateway.updateUser(userId, withoutAdministratorMutation(parsed.data)),
    );
  } catch (error) {
    return tenantUserActionResult(error, 'Não foi possível atualizar o usuário.');
  }

  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
  return { success: true, message: 'Dados e permissões atualizados com sucesso.' };
}

export async function deleteTenantUserAction(userId: string): Promise<TenantUserFormResult> {
  if (!z.string().uuid().safeParse(userId).success) {
    return {
      success: false,
      message: 'Usuário inválido.',
      errorCode: 'VALIDATION_ERROR',
    };
  }

  try {
    await executeAuthenticatedTenantMutation((gateway) => gateway.deleteUser(userId));
  } catch (error) {
    return tenantUserActionResult(error, 'Não foi possível excluir o usuário.');
  }

  revalidatePath('/users');
  return { success: true, message: 'Usuário excluído com sucesso.' };
}

const updateUserStatusSchema = z
  .object({
    status: z.enum(['active', 'inactive', 'suspended']),
    suspendedUntil: z.string().datetime().optional(),
    suspensionReason: z.string().trim().max(500).optional(),
  })
  .superRefine((input, context) => {
    if (input.status !== 'suspended') return;

    if (!input.suspendedUntil || Date.parse(input.suspendedUntil) <= Date.now()) {
      context.addIssue({
        code: 'custom',
        message: 'Informe uma data futura para a suspensão.',
        path: ['suspendedUntil'],
      });
    }

    if (!input.suspensionReason || input.suspensionReason.length < 3) {
      context.addIssue({
        code: 'custom',
        message: 'Informe o motivo da suspensão.',
        path: ['suspensionReason'],
      });
    }
  });

export async function updateTenantUserStatusAction(
  userId: string,
  input: unknown,
): Promise<TenantUserFormResult> {
  const parsed = updateUserStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Revise o estado do usuário.',
      errorCode: 'VALIDATION_ERROR',
    };
  }

  try {
    await executeAuthenticatedTenantMutation((gateway) =>
      gateway.updateUserStatus(userId, parsed.data),
    );
  } catch (error) {
    return tenantUserActionResult(error, 'Não foi possível alterar o estado do usuário.');
  }

  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
  const labels = {
    active: 'ativado',
    inactive: 'desativado',
    suspended: 'suspenso',
  } as const;
  return {
    success: true,
    message: `Usuário ${labels[parsed.data.status]} com sucesso.`,
  };
}

export async function requestTenantUserPasswordResetAction(
  userId: string,
): Promise<TenantUserFormResult> {
  try {
    const result = await executeAuthenticatedTenantMutation((gateway) =>
      gateway.requestPasswordReset(userId),
    );
    revalidatePath('/users');
    return {
      success: true,
      message: `Enviamos as instruções para ${result.recipient}.`,
    };
  } catch (error) {
    return tenantUserActionResult(error, 'Não foi possível solicitar a criação de uma nova senha.');
  }
}
