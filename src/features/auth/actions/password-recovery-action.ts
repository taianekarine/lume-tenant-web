'use server';

import { AuthenticationGatewayError } from '../application';
import { createTenantApiAuthenticationGateway } from '../infrastructure';
import { AUTH_FALLBACK_ERROR_CODES, type AuthFailureFeedback } from '../lib/auth-error-feedback';
import { normalizeLoginIdentifier } from '../lib/login-identifier';
import { PASSWORD_RECOVERY_CONFIRMATION } from '../lib/password-recovery-messages';
import { passwordRecoverySchema } from '../lib/password-recovery-schema';

export type PasswordRecoveryActionResult =
  AuthFailureFeedback | { readonly success: true; readonly message: string };

export async function requestPasswordResetAction(
  input: unknown,
): Promise<PasswordRecoveryActionResult> {
  const validation = passwordRecoverySchema.safeParse(input);

  if (!validation.success) {
    return {
      success: false,
      message: validation.error.issues[0]?.message ?? 'Informe um usuário ou e-mail válido.',
      errorCode: AUTH_FALLBACK_ERROR_CODES.validation,
    };
  }

  try {
    await createTenantApiAuthenticationGateway().requestPasswordReset(
      normalizeLoginIdentifier(validation.data.identifier).value,
    );

    return {
      success: true,
      message: PASSWORD_RECOVERY_CONFIRMATION,
    };
  } catch (error) {
    if (error instanceof AuthenticationGatewayError && error.code === 'invalid-credentials') {
      return {
        success: true,
        message: PASSWORD_RECOVERY_CONFIRMATION,
      };
    }

    if (error instanceof AuthenticationGatewayError) {
      return {
        success: false,
        message:
          error.code === 'request-timeout'
            ? 'A solicitação demorou para ser processada. Tente novamente.'
            : 'Não foi possível solicitar a recuperação agora. Tente novamente ou contate o administrador.',
        errorCode: error.publicCode,
      };
    }

    return {
      success: false,
      message:
        'Não foi possível solicitar a recuperação agora. Tente novamente ou contate o administrador.',
      errorCode: AUTH_FALLBACK_ERROR_CODES.unexpected,
    };
  }
}
