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

import { DocumentManagementError, type DocumentManagementGateway } from '../application';
import { createDocumentManagementGateway } from '../infrastructure';

async function execute<T>(
  operation: (gateway: DocumentManagementGateway, accessToken: string) => Promise<T>,
  canRefreshCookies: boolean,
): Promise<T> {
  const [sessionStorage, tokenStorage] = await Promise.all([
    createCookieSessionStorage(),
    createCookieApiTokenStorage(),
  ]);
  const [session, storedTokens] = await Promise.all([sessionStorage.get(), tokenStorage.get()]);
  if (session === null || !isSessionValid(session) || storedTokens === null) {
    throw new DocumentManagementError('unauthorized', 'Sua sessão local expirou.');
  }
  let tokens = storedTokens;

  async function refresh(): Promise<ApiAuthentication> {
    try {
      const refreshed = await createTenantApiAuthenticationGateway().refresh(tokens.refreshToken);
      await Promise.all([
        sessionStorage.save(refreshed.session),
        tokenStorage.save(refreshed.tokens),
      ]);
      tokens = refreshed.tokens;
      return refreshed;
    } catch (error) {
      await Promise.allSettled([sessionStorage.remove(), tokenStorage.remove()]);
      throw new DocumentManagementError(
        error instanceof AuthenticationGatewayError && error.code === 'invalid-response'
          ? 'invalid-response'
          : 'unauthorized',
        'Sua sessão expirou. Entre novamente.',
      );
    }
  }

  if (shouldRefreshApiToken(tokens)) {
    if (!canRefreshCookies) {
      throw new DocumentManagementError('unauthorized', 'Sua sessão precisa ser renovada.');
    }
    await refresh();
  }

  try {
    return await operation(createDocumentManagementGateway(tokens.accessToken), tokens.accessToken);
  } catch (error) {
    if (!(error instanceof DocumentManagementError) || error.code !== 'unauthorized') throw error;
    if (!canRefreshCookies) throw error;
  }

  await refresh();
  return operation(createDocumentManagementGateway(tokens.accessToken), tokens.accessToken);
}

export function executeAuthenticatedDocumentRequest<T>(
  operation: (gateway: DocumentManagementGateway, accessToken: string) => Promise<T>,
): Promise<T> {
  return execute(operation, false);
}

export function executeAuthenticatedDocumentMutation<T>(
  operation: (gateway: DocumentManagementGateway, accessToken: string) => Promise<T>,
): Promise<T> {
  return execute(operation, true);
}
