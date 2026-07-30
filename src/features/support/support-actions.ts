'use server';

import { hasPermission } from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';

import { executeAuthenticatedSupportMutation } from './execute-authenticated-support-mutation';
import { SupportGatewayError } from './support-gateway';
import { supportFormSchema, type SupportFormData } from './support-schema';

export type SubmitSupportRequestActionResult =
  | { readonly success: true; readonly requestId: string }
  | {
      readonly success: false;
      readonly message: string;
      readonly fallbackAllowed: boolean;
    };

export async function submitSupportRequestAction(
  input: SupportFormData,
): Promise<SubmitSupportRequestActionResult> {
  const session = await getCurrentAuthenticatedSession();
  if (session === null) {
    return {
      success: false,
      message: 'Sua sessão expirou. Entre novamente.',
      fallbackAllowed: false,
    };
  }
  if (!hasPermission(session.user, 'support:create')) {
    return {
      success: false,
      message: 'Você não tem permissão para abrir solicitações de suporte.',
      fallbackAllowed: false,
    };
  }
  const parsed = supportFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Revise os dados da solicitação.',
      fallbackAllowed: false,
    };
  }

  try {
    const submitted = await executeAuthenticatedSupportMutation((gateway) =>
      gateway.submit(parsed.data),
    );
    return { success: true, requestId: submitted.id };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof SupportGatewayError
          ? error.message
          : 'Não foi possível enviar a solicitação pelo provedor de e-mail.',
      fallbackAllowed: error instanceof SupportGatewayError && error.fallbackAllowed,
    };
  }
}
