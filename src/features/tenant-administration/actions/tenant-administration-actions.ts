'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { TenantAdministrationError } from '../application';
import { executeAuthenticatedTenantMutation } from '../server';

const userBaseSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(254),
  cpf: z.string().trim().optional(),
  departments: z.array(z.string().min(1)),
  roleIds: z.array(z.string().uuid()),
});
const createUserSchema = userBaseSchema.extend({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9._-]{3,40}$/),
  password: z
    .string()
    .min(12)
    .max(72)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/),
});
const roleSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{2,59}$/),
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(240).optional(),
  permissions: z.array(z.string().regex(/^[a-z0-9-]+:[a-z0-9-]+$/)),
});

function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function formStrings(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
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
    cpf: formString(formData, 'cpf') || undefined,
    password: formString(formData, 'password'),
    departments: formStrings(formData, 'departments'),
    roleIds: formStrings(formData, 'roleIds'),
  });

  if (!parsed.success) {
    redirect('/users?error=Revise os dados do novo usuário.');
  }

  try {
    await executeAuthenticatedTenantMutation((gateway) => gateway.createUser(parsed.data));
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
    cpf: formString(formData, 'cpf') || null,
    departments: formStrings(formData, 'departments'),
    roleIds: formStrings(formData, 'roleIds'),
  });

  if (!parsed.success) {
    redirect(`/users/${userId}?error=Revise os dados do usuário.`);
  }

  try {
    await executeAuthenticatedTenantMutation((gateway) => gateway.updateUser(userId, parsed.data));
  } catch (error) {
    actionFailureDestination(`/users/${userId}`, error);
  }

  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
  redirect(`/users/${userId}?success=Usuário atualizado com sucesso.`);
}

export async function setTenantUserActiveAction(userId: string, isActive: boolean): Promise<void> {
  try {
    await executeAuthenticatedTenantMutation((gateway) => gateway.updateUser(userId, { isActive }));
  } catch (error) {
    actionFailureDestination('/users', error);
  }

  revalidatePath('/users');
  redirect(`/users?success=Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso.`);
}

export async function createTenantRoleAction(formData: FormData): Promise<void> {
  const parsed = roleSchema.safeParse({
    code: formString(formData, 'code'),
    name: formString(formData, 'name'),
    description: formString(formData, 'description') || undefined,
    permissions: formStrings(formData, 'permissions'),
  });

  if (!parsed.success) {
    redirect('/roles?error=Revise os dados do papel.');
  }

  try {
    await executeAuthenticatedTenantMutation((gateway) => gateway.createRole(parsed.data));
  } catch (error) {
    actionFailureDestination('/roles', error);
  }

  revalidatePath('/roles');
  redirect('/roles?success=Papel criado com sucesso.');
}

export async function updateTenantRoleAction(roleId: string, formData: FormData): Promise<void> {
  const parsed = roleSchema.safeParse({
    code: formString(formData, 'code'),
    name: formString(formData, 'name'),
    description: formString(formData, 'description') || undefined,
    permissions: formStrings(formData, 'permissions'),
  });

  if (!parsed.success) {
    redirect(`/roles/${roleId}?error=Revise os dados do papel.`);
  }

  try {
    await executeAuthenticatedTenantMutation((gateway) => gateway.updateRole(roleId, parsed.data));
  } catch (error) {
    actionFailureDestination(`/roles/${roleId}`, error);
  }

  revalidatePath('/roles');
  revalidatePath(`/roles/${roleId}`);
  redirect(`/roles/${roleId}?success=Papel atualizado com sucesso.`);
}

export async function deleteTenantRoleAction(roleId: string): Promise<void> {
  try {
    await executeAuthenticatedTenantMutation((gateway) => gateway.deleteRole(roleId));
  } catch (error) {
    actionFailureDestination('/roles', error);
  }

  revalidatePath('/roles');
  redirect('/roles?success=Papel excluído com sucesso.');
}
