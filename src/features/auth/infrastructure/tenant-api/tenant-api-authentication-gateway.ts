import { z } from 'zod';

import {
  AuthenticationGatewayError,
  type ApiAuthentication,
  type AuthenticationCredentials,
  type AuthenticationGateway,
} from '../../application';
import { AUTHENTICATED_SESSION_VERSION, type Permission } from '../../domain';

const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;
const MINIMUM_REQUEST_TIMEOUT_MS = 100;
const MAXIMUM_REQUEST_TIMEOUT_MS = 30_000;

type Fetcher = typeof fetch;

export interface TenantApiAuthenticationGatewayOptions {
  readonly baseUrl: string;
  readonly fetcher?: Fetcher;
  readonly now?: () => Date;
  readonly timeoutMs?: number;
}

const isoDateSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Data inválida.',
});

const permissionSchema = z.string().refine((value) => /^[a-z0-9-]+:[a-z0-9-]+$/.test(value), {
  message: 'Permissão inválida.',
});

const apiUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal('employee'),
  departments: z.array(z.string().min(1)),
  roles: z.array(z.string().min(1)),
  permissions: z.array(permissionSchema),
  clientCategory: z.null(),
  isActive: z.boolean(),
});

const apiAuthenticationSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(40),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive(),
  session: z.object({
    version: z.literal(AUTHENTICATED_SESSION_VERSION),
    id: z.string().min(1),
    user: apiUserSchema,
    issuedAt: isoDateSchema,
    expiresAt: isoDateSchema,
    rememberDevice: z.boolean(),
  }),
});

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function createRequestSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

export class TenantApiAuthenticationGateway implements AuthenticationGateway {
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;
  private readonly now: () => Date;
  private readonly timeoutMs: number;

  constructor(options: TenantApiAuthenticationGatewayOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  authenticate(credentials: AuthenticationCredentials): Promise<ApiAuthentication> {
    return this.requestAuthentication('/auth/login', credentials, 'invalid-credentials');
  }

  refresh(refreshToken: string): Promise<ApiAuthentication> {
    return this.requestAuthentication('/auth/refresh', { refreshToken }, 'invalid-refresh-token');
  }

  async logout(refreshToken: string): Promise<void> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (response.status === 401) {
      return;
    }

    if (!response.ok) {
      throw new AuthenticationGatewayError(
        'service-unavailable',
        'A API recusou o encerramento da sessão.',
      );
    }
  }

  private async requestAuthentication(
    path: string,
    body: AuthenticationCredentials | { readonly refreshToken: string },
    unauthorizedCode: 'invalid-credentials' | 'invalid-refresh-token',
  ): Promise<ApiAuthentication> {
    const response = await this.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      throw new AuthenticationGatewayError(
        unauthorizedCode,
        'A API rejeitou as credenciais apresentadas.',
      );
    }

    if (!response.ok) {
      throw new AuthenticationGatewayError(
        'service-unavailable',
        `A API respondeu com o status ${response.status}.`,
      );
    }

    let bodyValue: unknown;

    try {
      bodyValue = await response.json();
    } catch {
      throw new AuthenticationGatewayError(
        'invalid-response',
        'A API retornou uma resposta que não é JSON.',
      );
    }

    const parsedResponse = apiAuthenticationSchema.safeParse(bodyValue);

    if (!parsedResponse.success) {
      throw new AuthenticationGatewayError(
        'invalid-response',
        'A API retornou uma sessão incompatível com o frontend.',
      );
    }

    const authenticatedAt = this.now();
    const accessTokenExpiresAt = new Date(
      authenticatedAt.getTime() + parsedResponse.data.expiresIn * 1_000,
    ).toISOString();

    return {
      session: {
        version: parsedResponse.data.session.version,
        id: parsedResponse.data.session.id,
        user: {
          id: parsedResponse.data.session.user.id,
          name: parsedResponse.data.session.user.name,
          type: 'employee',
          departments: parsedResponse.data.session.user.departments,
          roles: parsedResponse.data.session.user.roles,
          permissions: parsedResponse.data.session.user.permissions as Permission[],
          clientCategory: null,
          isActive: parsedResponse.data.session.user.isActive,
        },
        issuedAt: parsedResponse.data.session.issuedAt,
        expiresAt: parsedResponse.data.session.expiresAt,
        rememberDevice: parsedResponse.data.session.rememberDevice,
      },
      tokens: {
        accessToken: parsedResponse.data.accessToken,
        refreshToken: parsedResponse.data.refreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt: parsedResponse.data.session.expiresAt,
      },
    };
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetcher(`${this.baseUrl}${path}`, {
        ...init,
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...init.headers,
        },
        signal: createRequestSignal(this.timeoutMs),
      });
    } catch {
      throw new AuthenticationGatewayError(
        'service-unavailable',
        'Não foi possível estabelecer comunicação com a API.',
      );
    }
  }
}

export function resolveTenantApiBaseUrl(
  value: string | undefined,
  nodeEnvironment = process.env.NODE_ENV,
): string {
  if (value === undefined || value.trim() === '') {
    throw new Error('LUME_TENANT_API_URL is required when simulated authentication is disabled.');
  }

  const normalizedValue = normalizeBaseUrl(value.trim());
  let url: URL;

  try {
    url = new URL(normalizedValue);
  } catch {
    throw new Error('LUME_TENANT_API_URL must be a valid absolute URL.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('LUME_TENANT_API_URL must use HTTP or HTTPS.');
  }

  if (nodeEnvironment === 'production' && url.protocol !== 'https:') {
    throw new Error('LUME_TENANT_API_URL must use HTTPS in production.');
  }

  return normalizedValue;
}

export function resolveTenantApiTimeout(value: string | undefined): number {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }

  const timeout = Number(value);

  if (
    !Number.isInteger(timeout) ||
    timeout < MINIMUM_REQUEST_TIMEOUT_MS ||
    timeout > MAXIMUM_REQUEST_TIMEOUT_MS
  ) {
    throw new Error(
      `LUME_TENANT_API_TIMEOUT_MS must be an integer between ${MINIMUM_REQUEST_TIMEOUT_MS} and ${MAXIMUM_REQUEST_TIMEOUT_MS}.`,
    );
  }

  return timeout;
}
