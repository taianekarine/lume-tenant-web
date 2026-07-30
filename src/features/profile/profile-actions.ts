'use server';

import { revalidatePath } from 'next/cache';

import {
  createCookieApiTokenStorage,
  createCookieSessionStorage,
} from '@/features/auth/infrastructure';
import { TenantAdministrationError } from '@/features/tenant-administration/application';
import { executeAuthenticatedTenantMutation } from '@/features/tenant-administration/server';

import { ownPasswordSchema, profilePictureSchema } from './profile-schema';

export type ProfileActionResult =
  | {
      readonly success: true;
      readonly message: string;
    }
  | {
      readonly success: false;
      readonly message: string;
      readonly errorCode: string;
    };

export async function updateProfilePictureAction(input: unknown): Promise<ProfileActionResult> {
  const parsed = profilePictureSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Selecione uma imagem JPEG, PNG ou WebP válida.',
      errorCode: 'VALIDATION_ERROR',
    };
  }
  try {
    await executeAuthenticatedTenantMutation((gateway) =>
      gateway.updateProfilePicture(parsed.data.dataUrl),
    );
    revalidatePath('/profile');
    return {
      success: true,
      message: parsed.data.dataUrl ? 'Foto atualizada.' : 'Foto removida.',
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof TenantAdministrationError
          ? error.message
          : 'Não foi possível atualizar a foto.',
      errorCode: error instanceof TenantAdministrationError ? error.publicCode : 'UNEXPECTED_ERROR',
    };
  }
}

export async function changeOwnPasswordAction(input: unknown): Promise<ProfileActionResult> {
  const parsed = ownPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Revise as senhas.',
      errorCode: 'VALIDATION_ERROR',
    };
  }
  try {
    await executeAuthenticatedTenantMutation((gateway) =>
      gateway.changeOwnPassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      }),
    );
    const [sessionStorage, tokenStorage] = await Promise.all([
      createCookieSessionStorage(),
      createCookieApiTokenStorage(),
    ]);
    await Promise.allSettled([sessionStorage.remove(), tokenStorage.remove()]);
    return {
      success: true,
      message: 'Senha alterada. Entre novamente para continuar.',
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof TenantAdministrationError
          ? error.message
          : 'Não foi possível alterar a senha.',
      errorCode: error instanceof TenantAdministrationError ? error.publicCode : 'UNEXPECTED_ERROR',
    };
  }
}
