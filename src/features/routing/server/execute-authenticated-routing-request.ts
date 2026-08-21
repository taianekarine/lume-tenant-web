import 'server-only';

import {
  AuthenticationGatewayError,
  shouldRefreshApiToken,
  type ApiAuthentication,
} from '@/features/auth/application';
import { isSessionValid } from '@/features/auth/domain';
import {
  createCookieApiTokenStorage,
  createCookieSessionStorage,
  createTenantApiAuthenticationGateway,
} from '@/features/auth/infrastructure';

import { RoutingError, type RoutingGateway } from '../application';
import { createRoutingGateway } from '../infrastructure';

async function execute<T>(
  operation: (gateway: RoutingGateway) => Promise<T>,
  canRefreshCookies: boolean,
): Promise<T> {
  const [sessionStorage, tokenStorage] = await Promise.all([
    createCookieSessionStorage(),
    createCookieApiTokenStorage(),
  ]);
  const [session, storedTokens] = await Promise.all([sessionStorage.get(), tokenStorage.get()]);
  if (session === null || !isSessionValid(session) || storedTokens === null) {
    throw new RoutingError('unauthorized', 'Sua sessão expirou.');
  }
  let tokens = storedTokens;
  async function refresh(): Promise<ApiAuthentication> {
    try {
      const authentication = await createTenantApiAuthenticationGateway().refresh(
        tokens.refreshToken,
      );
      await Promise.all([
        sessionStorage.save(authentication.session),
        tokenStorage.save(authentication.tokens),
      ]);
      tokens = authentication.tokens;
      return authentication;
    } catch (error) {
      if (error instanceof AuthenticationGatewayError) {
        throw new RoutingError('unauthorized', 'Sua sessão expirou. Entre novamente.');
      }
      throw new RoutingError('service-unavailable', 'Não foi possível renovar a sessão.');
    }
  }
  if (shouldRefreshApiToken(tokens)) {
    if (!canRefreshCookies)
      throw new RoutingError('unauthorized', 'Atualize a sessão antes desta operação.');
    await refresh();
  }
  try {
    return await operation(createRoutingGateway(tokens.accessToken));
  } catch (error) {
    if (!(error instanceof RoutingError) || error.code !== 'unauthorized' || !canRefreshCookies)
      throw error;
  }
  await refresh();
  return operation(createRoutingGateway(tokens.accessToken));
}

export function executeAuthenticatedRoutingRequest<T>(
  operation: (gateway: RoutingGateway) => Promise<T>,
) {
  return execute(operation, false);
}

export function executeAuthenticatedRoutingMutation<T>(
  operation: (gateway: RoutingGateway) => Promise<T>,
) {
  return execute(operation, true);
}
