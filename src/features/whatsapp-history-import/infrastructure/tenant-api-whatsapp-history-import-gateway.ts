import 'server-only';

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export async function sanitizeWhatsAppHistoryImportResponse(upstream: Response): Promise<Response> {
  if (upstream.status < 500) return upstream;

  return Response.json(
    {
      message:
        'NÃ£o foi possÃ­vel iniciar a importaÃ§Ã£o. Tente novamente e, se o problema continuar, contate o suporte.',
    },
    {
      status: upstream.status,
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}

export async function proxyWhatsAppHistoryImportRequest(
  accessToken: string,
  request: Request,
  upstreamPath: string,
): Promise<Response> {
  const baseUrl = process.env.LUME_TENANT_API_URL;
  if (!baseUrl) throw new Error('LUME_TENANT_API_URL is required.');

  const headers = new Headers({
    Accept: request.headers.get('accept') ?? 'application/json',
    Authorization: `Bearer ${accessToken}`,
  });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  const timeoutCandidate = Number(
    process.env.LUME_TENANT_API_WHATSAPP_IMPORT_TIMEOUT_MS ?? 600_000,
  );
  const timeoutMs =
    Number.isInteger(timeoutCandidate) && timeoutCandidate >= 30_000 ? timeoutCandidate : 600_000;
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    cache: 'no-store',
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  };
  if (hasBody && request.body !== null) {
    init.body = request.body;
    init.duplex = 'half';
  }

  const upstream = await fetch(
    `${normalizeBaseUrl(baseUrl)}/whatsapp/history-imports${upstreamPath}`,
    init,
  );
  return sanitizeWhatsAppHistoryImportResponse(upstream);
}
