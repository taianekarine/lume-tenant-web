'use server';

import { redirect } from 'next/navigation';

import {
  AuthenticationGatewayError,
  saveAuthenticatedSession,
  type ApiAuthenticationTokens,
  type ApiTokenStorage,
  type AuthenticationGateway,
  type SessionStorage,
} from '../application';
import { createAuthenticatedSession, type AuthenticatedSession } from '../domain';
import {
  createCookieApiTokenStorage,
  createCookieSessionStorage,
  createTenantApiAuthenticationGateway,
} from '../infrastructure';
import { loginSchema } from '../lib/login-schema';
import {
  findSimulatedUserByCredentials,
  isSimulatedLoginEnabled,
  type SimulatedUser,
} from '../simulation';

export interface LoginActionResult {
  readonly success: false;
  readonly message: string;
}

const LOGIN_DESTINATION = '/dashboard';
const INVALID_CREDENTIALS_MESSAGE = 'Usuário ou senha inválidos.';
const API_UNAVAILABLE_MESSAGE =
  'Não foi possível conectar ao serviço de autenticação. Tente novamente.';

function createSimulatedSession(user: SimulatedUser, rememberDevice: boolean) {
  const sessionId = crypto.randomUUID();

  return createAuthenticatedSession({
    sessionId,
    userId: user.id,
    name: user.name,
    type: 'employee',
    departments: user.departments,
    roles: user.roles,
    isActive: user.isActive,
    rememberDevice,
  });
}

export async function loginAction(input: unknown): Promise<LoginActionResult> {
  const validation = loginSchema.safeParse(input);

  if (!validation.success) {
    return {
      success: false,
      message: validation.error.issues[0]?.message ?? 'Informe dados de acesso válidos.',
    };
  }

  const simulationEnabled = isSimulatedLoginEnabled(
    process.env.NODE_ENV,
    process.env.AUTH_SIMULATION_ENABLED,
  );
  let session: AuthenticatedSession;
  let apiTokens: ApiAuthenticationTokens | null = null;
  let authenticationGateway: AuthenticationGateway | null = null;
  let sessionStorage: SessionStorage | null = null;
  let apiTokenStorage: ApiTokenStorage | null = null;

  if (simulationEnabled) {
    const simulatedUser = findSimulatedUserByCredentials(
      validation.data.identifier,
      validation.data.password,
    );

    if (simulatedUser === null || !simulatedUser.isActive) {
      return {
        success: false,
        message: INVALID_CREDENTIALS_MESSAGE,
      };
    }

    session = createSimulatedSession(simulatedUser, validation.data.remember);
  } else {
    try {
      authenticationGateway = createTenantApiAuthenticationGateway();
      const authentication = await authenticationGateway.authenticate(validation.data);

      session = authentication.session;
      apiTokens = authentication.tokens;
    } catch (error) {
      if (error instanceof AuthenticationGatewayError && error.code === 'invalid-credentials') {
        return {
          success: false,
          message: INVALID_CREDENTIALS_MESSAGE,
        };
      }

      return {
        success: false,
        message: API_UNAVAILABLE_MESSAGE,
      };
    }
  }

  try {
    [sessionStorage, apiTokenStorage] = await Promise.all([
      createCookieSessionStorage(),
      createCookieApiTokenStorage(),
    ]);

    await saveAuthenticatedSession(sessionStorage, session);

    if (apiTokens === null) {
      await apiTokenStorage.remove();
    } else {
      await apiTokenStorage.save(apiTokens);
    }
  } catch {
    if (authenticationGateway !== null && apiTokens !== null) {
      try {
        await authenticationGateway.logout(apiTokens.refreshToken);
      } catch {
        // The local login still fails safely even if remote cleanup is unavailable.
      }
    }

    await Promise.allSettled([sessionStorage?.remove(), apiTokenStorage?.remove()]);

    return {
      success: false,
      message: 'Não foi possível iniciar sua sessão. Tente novamente.',
    };
  }

  redirect(LOGIN_DESTINATION);
}
