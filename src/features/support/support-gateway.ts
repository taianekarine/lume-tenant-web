import 'server-only';

import { z } from 'zod';

export type SupportGatewayErrorCode =
  'unauthorized' | 'forbidden' | 'validation' | 'service-unavailable' | 'invalid-response';

export class SupportGatewayError extends Error {
  constructor(
    readonly code: SupportGatewayErrorCode,
    message: string,
    readonly fallbackAllowed = false,
  ) {
    super(message);
    this.name = 'SupportGatewayError';
  }
}

export interface SubmittedSupportRequest {
  readonly id: string;
}

export interface SupportGateway {
  submit(input: {
    readonly subject: string;
    readonly message: string;
  }): Promise<SubmittedSupportRequest>;
}

const successSchema = z
  .object({
    id: z.string().min(1),
  })
  .passthrough();

const errorSchema = z
  .object({
    message: z.union([z.string(), z.array(z.string())]).optional(),
    details: z
      .object({
        fallbackAllowed: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export class TenantApiSupportGateway implements SupportGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs = 8_000,
  ) {}

  async submit(input: {
    readonly subject: string;
    readonly message: string;
  }): Promise<SubmittedSupportRequest> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl.replace(/\/+$/, '')}/support/requests`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new SupportGatewayError(
        'service-unavailable',
        'O provedor de e-mail não respondeu. Você pode abrir a solicitação no seu aplicativo de e-mail.',
        true,
      );
    }

    if (!response.ok) {
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        // Respostas sem JSON usam a mensagem segura abaixo.
      }
      const parsed = errorSchema.safeParse(body);
      const rawMessage = parsed.success ? parsed.data.message : undefined;
      const message = Array.isArray(rawMessage) ? rawMessage.join(' ') : rawMessage;
      const code: SupportGatewayErrorCode =
        response.status === 401
          ? 'unauthorized'
          : response.status === 403
            ? 'forbidden'
            : [400, 413, 422].includes(response.status)
              ? 'validation'
              : 'service-unavailable';
      throw new SupportGatewayError(
        code,
        message?.trim() ||
          'Não foi possível enviar a solicitação pelo provedor. Use a alternativa de e-mail abaixo.',
        code === 'service-unavailable' &&
          parsed.success &&
          parsed.data.details?.fallbackAllowed === true,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new SupportGatewayError(
        'invalid-response',
        'O provedor confirmou o envio, mas retornou uma resposta inválida.',
      );
    }
    const parsed = successSchema.safeParse(body);
    if (!parsed.success) {
      throw new SupportGatewayError(
        'invalid-response',
        'O provedor confirmou o envio, mas retornou uma resposta inválida.',
      );
    }
    return { id: parsed.data.id };
  }
}
