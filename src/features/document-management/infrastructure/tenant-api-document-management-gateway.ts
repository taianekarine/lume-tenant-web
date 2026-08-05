import 'server-only';

import { z } from 'zod';

import {
  DocumentManagementError,
  type DocumentManagementErrorCode,
  type DocumentManagementGateway,
} from '../application';

type Fetcher = typeof fetch;

const isoDate = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const documentTypeSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  active: z.boolean(),
});
const nullableIsoDate = isoDate.nullable();
const contextSchema = z.enum([
  'admission',
  'document-update',
  'document-renewal',
  'regularization',
  'offboarding',
  'other',
]);
const requestStatusSchema = z.enum([
  'draft',
  'pending-upload',
  'partially-submitted',
  'submitted',
  'automatic-validation',
  'pending-human-review',
  'resubmission-required',
  'approved',
  'rejected',
  'expired',
  'cancelled',
]);
const itemStatusSchema = z.enum([
  'pending-upload',
  'submitted',
  'automatic-validation',
  'pending-human-review',
  'resubmission-required',
  'approved',
  'rejected',
  'expired',
  'waived',
  'cancelled',
]);
const subjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});
const checklistReferenceSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive(),
});
const requestSummarySchema = z.object({
  id: z.string().uuid(),
  context: contextSchema,
  status: requestStatusSchema,
  deadline: nullableIsoDate,
  version: z.number().int().positive(),
  subject: subjectSchema,
  checklist: checklistReferenceSchema,
  progress: z.object({
    total: z.number().int().nonnegative(),
    approved: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
  }),
  createdAt: isoDate,
  updatedAt: isoDate,
});
const requestListSchema = z.object({
  data: z.array(requestSummarySchema),
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});
const submissionSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  status: itemStatusSchema,
  extractedData: z.record(z.string(), z.unknown()),
  confirmedData: z.record(z.string(), z.unknown()),
  submittedAt: isoDate,
  files: z.array(
    z.object({
      id: z.string().uuid(),
      side: z.enum(['single', 'front', 'back', 'page']),
      pageNumber: z.number().int().positive(),
      fileName: z.string().min(1),
      mimeType: z.string().min(1),
      sizeBytes: z.number().int().positive(),
      sha256: z.string().length(64),
      createdAt: isoDate,
      contentPath: z.string().optional(),
    }),
  ),
  validation: z
    .object({
      status: z.string(),
      alerts: z.array(z.unknown()),
      extractedFields: z.record(z.string(), z.unknown()),
      overallConfidence: z.number().nullable(),
      summary: z.string().nullable(),
      provider: z.string(),
      modelVersion: z.string().nullable(),
      completedAt: nullableIsoDate,
      suggestedDocumentTypeCode: z.string().nullable().optional(),
      result: z.unknown().optional(),
    })
    .nullable(),
  reviews: z.array(
    z.object({
      id: z.string().uuid(),
      decision: z.string(),
      reason: z.string().nullable(),
      notes: z.string().nullable(),
      originalCheckStatus: z.string(),
      originalCheckedAt: nullableIsoDate,
      originalObservation: z.string().nullable(),
      reviewedBy: z.object({ id: z.string().uuid(), name: z.string().min(1) }),
      createdAt: isoDate,
      correctedFields: z.unknown().optional(),
      confirmedFields: z.unknown().optional(),
    }),
  ),
});
const requestDetailSchema = z.object({
  id: z.string().uuid(),
  context: contextSchema,
  status: requestStatusSchema,
  deadline: nullableIsoDate,
  notes: z.string().nullable(),
  version: z.number().int().positive(),
  completedAt: nullableIsoDate,
  createdAt: isoDate,
  updatedAt: isoDate,
  subject: subjectSchema.extend({
    documentAccessMode: z.enum(['standard', 'document-portal']).default('standard'),
  }),
  createdBy: z.object({ id: z.string().uuid(), name: z.string().min(1) }),
  checklist: checklistReferenceSchema,
  items: z.array(
    z.object({
      id: z.string().uuid(),
      requirement: z.enum(['required', 'optional', 'conditional']),
      status: itemStatusSchema,
      position: z.number().int().positive(),
      instructions: z.string().nullable(),
      dueAt: nullableIsoDate,
      validUntil: nullableIsoDate,
      currentVersion: z.number().int().nonnegative(),
      config: z.record(z.string(), z.unknown()),
      documentType: z.object({
        id: z.string().uuid(),
        code: z.string().min(1),
        name: z.string().min(1),
        description: z.string().nullable(),
      }),
      submissions: z.array(submissionSchema),
    }),
  ),
});
const checklistSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  context: contextSchema,
  version: z.number().int().positive(),
  active: z.boolean(),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      requirement: z.enum(['required', 'optional', 'conditional']),
      instructions: z.string().nullable(),
      documentType: z.object({
        id: z.string().uuid(),
        code: z.string().min(1),
        name: z.string().min(1),
      }),
    }),
  ),
});
const apiErrorSchema = z.object({
  code: z.string().optional(),
  message: z.union([z.string(), z.array(z.string())]).optional(),
});

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function statusToCode(status: number): DocumentManagementErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if ([400, 413, 422].includes(status)) return 'validation';
  return 'service-unavailable';
}

function searchParams(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export class TenantApiDocumentManagementGateway implements DocumentManagementGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMs = 15_000,
  ) {}

  async listRequests(query: Parameters<DocumentManagementGateway['listRequests']>[0] = {}) {
    return this.parse(
      requestListSchema,
      await this.requestJson(
        `/document-management/requests${searchParams({
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 20,
          status: query.status,
          context: query.context,
          subjectUserId: query.subjectUserId,
        })}`,
      ),
    );
  }

  async getRequest(requestId: string) {
    const body = await this.requestJson(
      `/document-management/requests/${encodeURIComponent(requestId)}`,
    );
    return this.parse(z.object({ request: requestDetailSchema }), body).request;
  }

  async listChecklists() {
    const body = await this.requestJson('/document-management/checklists');
    return this.parse(z.object({ data: z.array(checklistSchema) }), body).data;
  }

  async listDocumentTypes() {
    const body = await this.requestJson('/document-management/document-types');
    return this.parse(z.object({ data: z.array(documentTypeSchema) }), body).data;
  }

  async createRequest(input: Parameters<DocumentManagementGateway['createRequest']>[0]) {
    const body = await this.requestJson('/document-management/requests', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return this.parse(z.object({ request: requestDetailSchema }), body).request;
  }

  async addRequestItem(
    requestId: string,
    input: Parameters<DocumentManagementGateway['addRequestItem']>[1],
  ) {
    const body = await this.requestJson(
      `/document-management/requests/${encodeURIComponent(requestId)}/items`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return this.parse(z.object({ request: requestDetailSchema }), body).request;
  }

  async setRequestItemPolicy(
    requestItemId: string,
    input: Parameters<DocumentManagementGateway['setRequestItemPolicy']>[1],
  ) {
    const body = await this.requestJson(
      `/document-management/items/${encodeURIComponent(requestItemId)}/policy`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return this.parse(z.object({ request: requestDetailSchema }), body).request;
  }

  async upload(requestItemId: string, formData: FormData) {
    const body = await this.requestJson(
      `/document-management/items/${encodeURIComponent(requestItemId)}/submissions`,
      { method: 'POST', body: formData },
    );
    return this.parse(z.object({ request: requestDetailSchema }), body).request;
  }

  async completeSubmission(submissionId: string) {
    const body = await this.requestJson(
      `/document-management/submissions/${encodeURIComponent(submissionId)}/complete`,
      { method: 'POST' },
    );
    return this.parse(z.object({ request: requestDetailSchema }), body).request;
  }

  async updateExtractedData(
    submissionId: string,
    input: Parameters<DocumentManagementGateway['updateExtractedData']>[1],
  ) {
    const body = await this.requestJson(
      `/document-management/submissions/${encodeURIComponent(submissionId)}/extracted-data`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return this.parse(z.object({ request: requestDetailSchema }), body).request;
  }

  async review(submissionId: string, input: Parameters<DocumentManagementGateway['review']>[1]) {
    const body = await this.requestJson(
      `/document-management/submissions/${encodeURIComponent(submissionId)}/reviews`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return this.parse(z.object({ request: requestDetailSchema }), body).request;
  }

  async getFile(fileId: string): Promise<Response> {
    const response = await this.fetcher(
      `${normalizeBaseUrl(this.baseUrl)}/document-management/files/${encodeURIComponent(fileId)}/content`,
      {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    );
    if (!response.ok) await this.throwApiError(response);
    return response;
  }

  async downloadExport(): Promise<Response> {
    const response = await this.fetcher(
      `${normalizeBaseUrl(this.baseUrl)}/document-management/export.xlsx`,
      {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    );
    if (!response.ok) await this.throwApiError(response);
    return response;
  }

  async downloadUserExport(subjectUserId: string): Promise<Response> {
    return this.download(
      `/document-management/users/${encodeURIComponent(subjectUserId)}/export.xlsx`,
    );
  }

  async downloadUserFiles(subjectUserId: string): Promise<Response> {
    return this.download(
      `/document-management/users/${encodeURIComponent(subjectUserId)}/files.zip`,
    );
  }

  private async download(path: string): Promise<Response> {
    const response = await this.fetcher(`${normalizeBaseUrl(this.baseUrl)}${path}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${this.accessToken}` },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) await this.throwApiError(response);
    return response;
  }

  private async requestJson(path: string, init: RequestInit = {}): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetcher(`${normalizeBaseUrl(this.baseUrl)}${path}`, {
        ...init,
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
          ...init.headers,
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new DocumentManagementError(
        'service-unavailable',
        'Não foi possível conectar à Tenant API.',
      );
    }
    if (!response.ok) await this.throwApiError(response);
    try {
      return await response.json();
    } catch {
      throw new DocumentManagementError(
        'invalid-response',
        'A Tenant API retornou uma resposta inválida.',
      );
    }
  }

  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      throw new DocumentManagementError(
        'invalid-response',
        'A resposta documental da Tenant API é incompatível com o frontend.',
      );
    }
    return parsed.data;
  }

  private async throwApiError(response: Response): Promise<never> {
    let message = `A Tenant API respondeu com o status ${response.status}.`;
    let publicCode = `HTTP_${response.status}`;
    try {
      const parsed = apiErrorSchema.safeParse(await response.json());
      if (parsed.success) {
        publicCode = parsed.data.code ?? publicCode;
        if (parsed.data.message) {
          message = Array.isArray(parsed.data.message)
            ? parsed.data.message.join(' ')
            : parsed.data.message;
        }
      }
    } catch {
      // Mantém códigos determinísticos sem expor conteúdo técnico.
    }
    throw new DocumentManagementError(statusToCode(response.status), message, publicCode);
  }
}

export function createDocumentManagementGateway(accessToken: string) {
  const baseUrl = process.env.LUME_TENANT_API_URL;
  if (!baseUrl) throw new Error('LUME_TENANT_API_URL is required.');
  return new TenantApiDocumentManagementGateway(baseUrl, accessToken);
}
