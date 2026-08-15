import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { RoutingError, type RoutingGateway } from '../application';

type Fetcher = typeof fetch;

const nullableString = z.string().nullable();
const companySchema = z.object({
  id: z.string().uuid(),
  taxId: z.string(),
  legalName: z.string(),
  tradeName: nullableString,
  costCenter: nullableString,
  status: z.enum(['active', 'inactive', 'suspended']),
  version: z.number().int(),
});
const addressSchema = z.object({
  label: z.string(),
  street: z.string(),
  number: z.string(),
  complement: nullableString,
  district: z.string(),
  postalCode: z.string(),
  city: z.string(),
  state: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});
const shiftSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  requiredArrivalTime: z.string(),
  vehicleCount: z.number().int().nullable(),
  vehicleCapacity: z.number().int().nullable(),
  activeWeekdays: z.array(z.number().int()),
});
const contractSchema = z.object({
  id: z.string().uuid(),
  routingCompanyId: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  operationType: z.string(),
  routeType: z.enum(['municipal', 'intermunicipal']),
  status: z.enum(['draft', 'active', 'suspended', 'ended']),
  periodicity: z.enum(['monthly', 'weekly', 'daily', 'per-route']),
  contractedVehicleCount: z.number().int(),
  predictedVehicleName: z.string(),
  predictedVehicleCapacity: z.number().int(),
  contractedKm: z.number().nullable(),
  plannedKm: z.number().nullable(),
  unitName: z.string(),
  validFrom: z.string(),
  validUntil: nullableString,
  costCenters: z.array(
    z.object({ id: z.string().uuid().optional(), code: z.string(), name: nullableString }),
  ),
  shifts: z.array(shiftSchema),
  version: z.number().int(),
});
const passengerSchema = z.object({
  id: z.string().uuid(),
  routingCompanyId: z.string().uuid(),
  fullName: z.string(),
  externalReference: nullableString,
  shift: nullableString,
  requiredArrivalTime: nullableString,
  sector: nullableString,
  status: z.enum(['active', 'on-leave', 'vacation', 'temporarily-off-route', 'unlinked']),
  registrationStatus: z.enum(['ready', 'pending']),
  routingEligible: z.boolean(),
  accessibilityRequired: z.boolean(),
  version: z.number().int(),
});
const routeSchema = z.object({
  id: z.string().uuid(),
  routingCompanyId: z.string().uuid(),
  contractId: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  shift: z.string(),
  requiredArrivalTime: z.string(),
  status: z.enum(['draft', 'routed', 'in-review', 'pending-approval', 'approved', 'published']),
  predictedVehicleName: z.string(),
  predictedVehicleCapacity: z.number().int(),
  plannedOutboundKm: z.number().nullable(),
  plannedReturnKm: z.number().nullable(),
  plannedTotalKm: z.number().nullable(),
  estimatedDurationMinutes: z.number().int().nullable(),
  overflowPassengerCount: z.number().int(),
  additionalRouteSuggested: z.boolean(),
  needsRerouting: z.boolean(),
  approvedVersion: z.number().int().nullable(),
  version: z.number().int(),
});
const routeDetailSchema = z.object({
  route: routeSchema,
  points: z.array(
    z.object({
      id: z.string().uuid(),
      direction: z.enum(['outbound', 'return']),
      sequence: z.number().int(),
      address: addressSchema,
      scheduledTime: nullableString,
      alerts: z.array(z.string()),
    }),
  ),
  assignments: z.array(
    z.object({
      id: z.string().uuid(),
      passengerId: z.string().uuid(),
      pointId: z.string().uuid().nullable(),
      status: z.enum(['assigned', 'overflow', 'pending-data', 'pending-documents']),
      walkingDistanceMeters: z.number().int().nullable(),
      boardingOrder: z.number().int().nullable(),
      warnings: z.array(z.string()),
      passengerName: z.string().optional(),
    }),
  ),
  navigationLinks: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url(),
        direction: z.enum(['outbound', 'return']),
        sequence: z.number().int(),
      }),
    )
    .optional(),
});

function listSchema<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ items: z.array(schema), total: z.number().int().nonnegative() });
}

function queryString(values: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

function fileName(response: Response, fallback: string): string {
  const disposition = response.headers.get('content-disposition');
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

export class TenantApiRoutingGateway implements RoutingGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMs = 10_000,
  ) {}

  listCompanies(query: { search?: string; status?: string } = {}) {
    return this.json(`/routing/companies${queryString(query)}`, listSchema(companySchema));
  }

  createCompany(input: Record<string, unknown>) {
    return this.json('/routing/companies', companySchema, {
      method: 'POST',
      body: { ...input, commandId: randomUUID() },
    });
  }

  listContracts(query: { routingCompanyId?: string; search?: string; status?: string } = {}) {
    return this.json(`/routing/contracts${queryString(query)}`, listSchema(contractSchema));
  }

  createContract(input: Record<string, unknown>) {
    return this.json('/routing/contracts', contractSchema, {
      method: 'POST',
      body: { ...input, commandId: randomUUID() },
    });
  }

  listPassengers(
    query: {
      routingCompanyId?: string;
      search?: string;
      status?: string;
      registrationStatus?: string;
    } = {},
  ) {
    return this.json(`/routing/passengers${queryString(query)}`, listSchema(passengerSchema));
  }

  createPassenger(input: Record<string, unknown>) {
    return this.json('/routing/passengers', passengerSchema, {
      method: 'POST',
      body: { ...input, commandId: randomUUID() },
    });
  }

  async passengerTemplate() {
    return this.binary('/routing/passengers/template.xlsx', 'modelo-colaboradores.xlsx');
  }

  async importPassengers(file: File, commandId: string) {
    const body = new FormData();
    body.set('file', file);
    body.set('commandId', commandId);
    return this.rawJson('/routing/passengers/imports', { method: 'POST', body });
  }

  async listRoutes(query: { routingCompanyId?: string; search?: string; status?: string } = {}) {
    const result = await this.json(
      `/routing/routes${queryString(query)}`,
      listSchema(routeDetailSchema),
    );
    return { items: result.items.map((item) => item.route), total: result.total };
  }

  getRoute(routeId: string) {
    return this.json(`/routing/routes/${encodeURIComponent(routeId)}`, routeDetailSchema);
  }

  generateRoutes(contractId: string, serviceDate: string, shiftId?: string) {
    return this.json(
      `/routing/contracts/${encodeURIComponent(contractId)}/generate-routes`,
      z.object({
        contractId: z.string().uuid(),
        serviceDate: z.string(),
        routes: z.array(routeDetailSchema),
      }),
      {
        method: 'POST',
        body: { commandId: randomUUID(), serviceDate, ...(shiftId ? { shiftId } : {}) },
      },
    );
  }

  transitionRoute(
    routeId: string,
    status: Parameters<RoutingGateway['transitionRoute']>[1],
    expectedVersion: number,
  ) {
    return this.json(
      `/routing/routes/${encodeURIComponent(routeId)}/transition`,
      routeDetailSchema,
      {
        method: 'POST',
        body: { commandId: randomUUID(), expectedVersion, status },
      },
    );
  }

  approveRoute(routeId: string, expectedVersion: number) {
    return this.json(`/routing/routes/${encodeURIComponent(routeId)}/approve`, routeDetailSchema, {
      method: 'POST',
      body: { commandId: randomUUID(), expectedVersion },
    });
  }

  publishRoute(routeId: string, expectedVersion: number) {
    return this.json(`/routing/routes/${encodeURIComponent(routeId)}/publish`, routeDetailSchema, {
      method: 'POST',
      body: { commandId: randomUUID(), expectedVersion },
    });
  }

  downloadRoute(routeId: string, format: 'pdf' | 'xlsx' | 'my-maps.xlsx' | 'my-maps.csv') {
    const suffix = format === 'pdf' || format === 'xlsx' ? `export.${format}` : format;
    return this.binary(
      `/routing/routes/${encodeURIComponent(routeId)}/${suffix}`,
      `rota.${format.split('.').at(-1)}`,
    );
  }

  private async json<T>(
    path: string,
    schema: z.ZodType<T>,
    input: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    const value = await this.rawJson(path, input);
    const parsed = schema.safeParse(value);
    if (!parsed.success)
      throw new RoutingError(
        'invalid-response',
        'A API retornou dados de roteirização incompatíveis.',
      );
    return parsed.data;
  }

  private async rawJson(
    path: string,
    input: { method?: string; body?: unknown } = {},
  ): Promise<unknown> {
    const response = await this.request(path, input);
    if (!response.ok) await this.throwResponseError(response);
    try {
      return await response.json();
    } catch {
      throw new RoutingError('invalid-response', 'A API retornou uma resposta inválida.');
    }
  }

  private async binary(path: string, fallback: string) {
    const response = await this.request(path);
    if (!response.ok) await this.throwResponseError(response);
    return {
      content: await response.arrayBuffer(),
      contentType: response.headers.get('content-type') ?? 'application/octet-stream',
      fileName: fileName(response, fallback),
    };
  }

  private async request(
    path: string,
    input: { method?: string; body?: unknown } = {},
  ): Promise<Response> {
    try {
      const isForm = input.body instanceof FormData;
      return await this.fetcher(`${this.baseUrl.replace(/\/+$/, '')}${path}`, {
        method: input.method ?? 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          ...(!isForm && input.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body:
          input.body === undefined
            ? undefined
            : isForm
              ? (input.body as FormData)
              : JSON.stringify(input.body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new RoutingError(
        'service-unavailable',
        'Não foi possível conectar à API de roteirização.',
      );
    }
  }

  private async throwResponseError(response: Response): Promise<never> {
    let message = `A API respondeu com o status ${response.status}.`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (body.message)
        message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
    } catch {}
    const code =
      response.status === 401
        ? 'unauthorized'
        : response.status === 403
          ? 'forbidden'
          : response.status === 404
            ? 'not-found'
            : response.status === 409
              ? 'conflict'
              : response.status < 500
                ? 'validation'
                : 'service-unavailable';
    throw new RoutingError(code, message);
  }
}
