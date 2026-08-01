import 'server-only';

import {
  WhatsAppConversationRepositoryError,
  type WhatsAppConversationRepositoryErrorCode,
} from '../application';

type Fetcher = typeof fetch;

export interface WhatsAppMediaContentDownload {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly mimeType: string;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function responseStatusToErrorCode(
  status: number,
): WhatsAppConversationRepositoryErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 400 || status === 422) return 'validation';
  return 'service-unavailable';
}

async function responseErrorMessage(response: Response): Promise<string | null> {
  try {
    const value = (await response.json()) as {
      readonly message?: unknown;
    };
    const message = Array.isArray(value.message)
      ? value.message.join(' ')
      : value.message;
    return typeof message === 'string' && message.trim()
      ? message.trim()
      : null;
  } catch {
    return null;
  }
}

function decodedHeaderFileName(headers: Headers): string | null {
  const encoded = headers.get('x-whatsapp-media-filename');
  if (encoded) {
    try {
      const decoded = decodeURIComponent(encoded).trim();
      if (decoded) return decoded;
    } catch {
      // O Content-Disposition abaixo continua como fallback seguro.
    }
  }

  const disposition = headers.get('content-disposition');
  if (!disposition) return null;
  const encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (encodedMatch?.[1]) {
    try {
      const decoded = decodeURIComponent(encodedMatch[1]).trim();
      if (decoded) return decoded;
    } catch {
      // Tenta o filename simples.
    }
  }
  const simpleMatch = /filename="([^"]+)"/i.exec(disposition);
  return simpleMatch?.[1]?.trim() || null;
}

function safeFileName(value: string | null, messageId: string): string {
  const leaf = (value?.split(/[\\/]/).pop() ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '_')
    .replace(/["<>:|?*]/g, '_')
    .trim();
  return (leaf || `whatsapp-media-${messageId.slice(0, 8)}`).slice(0, 200);
}

export class LumeApiWhatsAppMediaContentGateway {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly accessToken: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMs = 30_000,
    private readonly maximumBytes = 25 * 1024 * 1024,
  ) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  async download(
    conversationId: string,
    messageId: string,
  ): Promise<WhatsAppMediaContentDownload> {
    let response: Response;
    try {
      response = await this.fetcher(
        `${this.baseUrl}/whatsapp/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/content`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: '*/*',
            Authorization: `Bearer ${this.accessToken}`,
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        },
      );
    } catch {
      throw new WhatsAppConversationRepositoryError(
        'service-unavailable',
        'Não foi possível conectar à Tenant API para carregar a mídia.',
      );
    }

    if (!response.ok) {
      throw new WhatsAppConversationRepositoryError(
        responseStatusToErrorCode(response.status),
        (await responseErrorMessage(response)) ??
          `A Tenant API respondeu com o status ${response.status}.`,
      );
    }

    const rawContentLength = response.headers.get('content-length');
    const declaredLength = rawContentLength ? Number(rawContentLength) : null;
    if (
      declaredLength !== null &&
      (!Number.isInteger(declaredLength) ||
        declaredLength < 1 ||
        declaredLength > this.maximumBytes)
    ) {
      throw new WhatsAppConversationRepositoryError(
        'invalid-response',
        'A Tenant API retornou um tamanho de mídia inválido.',
      );
    }

    const mimeType = response.headers
      .get('content-type')
      ?.split(';')[0]
      .trim()
      .toLowerCase();
    if (!mimeType) {
      throw new WhatsAppConversationRepositoryError(
        'invalid-response',
        'A Tenant API não informou o tipo da mídia.',
      );
    }

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await response.arrayBuffer());
    } catch {
      throw new WhatsAppConversationRepositoryError(
        'invalid-response',
        'A Tenant API retornou uma mídia que não pôde ser lida.',
      );
    }
    if (
      bytes.byteLength < 1 ||
      bytes.byteLength > this.maximumBytes ||
      (declaredLength !== null && bytes.byteLength !== declaredLength)
    ) {
      throw new WhatsAppConversationRepositoryError(
        'invalid-response',
        'A Tenant API retornou uma mídia incompleta ou acima do limite.',
      );
    }

    return {
      bytes,
      fileName: safeFileName(
        decodedHeaderFileName(response.headers),
        messageId,
      ),
      mimeType,
    };
  }
}
