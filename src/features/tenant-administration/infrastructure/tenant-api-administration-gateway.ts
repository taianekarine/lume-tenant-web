import { z } from 'zod';

import {
  TenantAdministrationError,
  type TenantAdministrationErrorCode,
  type TenantAdministrationGateway,
} from '../application';
import type {
  CreateTenantRoleInput,
  CreateTenantUserInput,
  UpdateTenantRoleInput,
  UpdateTenantUserInput,
} from '../domain';

type Fetcher = typeof fetch;

const isoDate = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  username: z.string().min(1),
  email: z.string().email(),
  cpf: z.string().nullable(),
  type: z.literal('employee'),
  departments: z.array(z.string()),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  clientCategory: z.null(),
  isActive: z.boolean(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
const userListSchema = z.object({
  data: z.array(userSchema),
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});
const roleSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  permissions: z.array(z.string()),
  isSystem: z.boolean(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
const roleListSchema = z.array(roleSchema);
const permissionCatalogSchema = z.object({
  resources: z.array(z.string()),
  actions: z.array(z.string()),
  actionsByResource: z.record(z.string(), z.array(z.string())),
  permissions: z.array(z.string()),
});
const licenseStatusSchema = z.object({
  state: z.enum(['active', 'grace']),
  tenantId: z.string().min(1),
  installationId: z.string().min(1),
  plan: z.string().min(1),
  features: z.array(z.string()),
  expiresAt: isoDate,
  graceUntil: isoDate,
});

function statusCodeToError(status: number): TenantAdministrationErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  return 'service-unavailable';
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function parseApiResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new TenantAdministrationError(
      'invalid-response',
      'A API local retornou uma resposta incompatível com o frontend.',
    );
  }

  return parsed.data;
}

function apiErrorMessage(value: unknown): string | null {
  const parsed = z
    .object({
      message: z.union([z.string(), z.array(z.string())]),
    })
    .safeParse(value);

  if (!parsed.success) return null;

  const message = Array.isArray(parsed.data.message)
    ? parsed.data.message.join(' ')
    : parsed.data.message;

  return message.trim() || null;
}

function searchParams(values: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export class TenantApiAdministrationGateway implements TenantAdministrationGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMs = 5_000,
  ) {}

  async listUsers(
    query: {
      page?: number;
      pageSize?: number;
      search?: string;
      isActive?: boolean;
    } = {},
  ) {
    return parseApiResponse(
      userListSchema,
      await this.request(
        `/users${searchParams({
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 20,
          search: query.search,
          isActive: query.isActive,
        })}`,
      ),
    );
  }

  async getUser(userId: string) {
    return parseApiResponse(userSchema, await this.request(`/users/${encodeURIComponent(userId)}`));
  }

  async createUser(input: CreateTenantUserInput) {
    return parseApiResponse(
      userSchema,
      await this.request('/users', { method: 'POST', body: input }),
    );
  }

  async updateUser(userId: string, input: UpdateTenantUserInput) {
    return parseApiResponse(
      userSchema,
      await this.request(`/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        body: input,
      }),
    );
  }

  async listRoles() {
    return parseApiResponse(roleListSchema, await this.request('/roles'));
  }

  async createRole(input: CreateTenantRoleInput) {
    return parseApiResponse(
      roleSchema,
      await this.request('/roles', { method: 'POST', body: input }),
    );
  }

  async updateRole(roleId: string, input: UpdateTenantRoleInput) {
    return parseApiResponse(
      roleSchema,
      await this.request(`/roles/${encodeURIComponent(roleId)}`, {
        method: 'PATCH',
        body: input,
      }),
    );
  }

  async deleteRole(roleId: string): Promise<void> {
    await this.request(`/roles/${encodeURIComponent(roleId)}`, { method: 'DELETE' }, true);
  }

  async listPermissions() {
    return parseApiResponse(permissionCatalogSchema, await this.request('/permissions'));
  }

  async getLicenseStatus() {
    return parseApiResponse(licenseStatusSchema, await this.request('/license/status'));
  }

  private async request(
    path: string,
    input: { method?: string; body?: unknown } = {},
    emptyResponse = false,
  ): Promise<unknown> {
    let response: Response;

    try {
      response = await this.fetcher(`${normalizeBaseUrl(this.baseUrl)}${path}`, {
        method: input.method ?? 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          ...(input.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new TenantAdministrationError(
        'service-unavailable',
        'Não foi possível conectar à API local.',
      );
    }

    if (!response.ok) {
      let message = `A API respondeu com o status ${response.status}.`;

      try {
        message = apiErrorMessage(await response.json()) ?? message;
      } catch {
        // Mantém a mensagem baseada no status.
      }

      throw new TenantAdministrationError(statusCodeToError(response.status), message);
    }

    if (emptyResponse || response.status === 204) return null;

    try {
      return await response.json();
    } catch {
      throw new TenantAdministrationError(
        'invalid-response',
        'A API local retornou uma resposta inválida.',
      );
    }
  }
}
