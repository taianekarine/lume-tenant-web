import { NextResponse } from 'next/server';

import { WhatsAppConversationRepositoryError } from '@/features/whatsapp-conversations/application';
import { executeAuthenticatedWhatsAppMutation } from '@/features/whatsapp-conversations/server';
import {
  proxyWhatsAppContactsRequest,
  resolveWhatsAppContactsPath,
} from '@/features/whatsapp-contacts/infrastructure';

export const dynamic = 'force-dynamic';

function errorStatus(error: WhatsAppConversationRepositoryError): number {
  if (error.code === 'unauthorized') return 401;
  if (error.code === 'forbidden') return 403;
  if (error.code === 'not-found') return 404;
  if (error.code === 'conflict') return 409;
  if (error.code === 'validation') return 400;
  return 503;
}

async function proxy(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const upstreamPath = resolveWhatsAppContactsPath(
    request.method,
    (await context.params).path ?? [],
  );
  if (upstreamPath === null) {
    return NextResponse.json({ message: 'Operação de contato inválida.' }, { status: 404 });
  }
  try {
    return await executeAuthenticatedWhatsAppMutation(async (_repository, accessToken) => {
      const upstream = await proxyWhatsAppContactsRequest(accessToken, request, upstreamPath);
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          'Cache-Control': 'private, no-store',
          'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
        },
      });
    });
  } catch (error) {
    if (error instanceof WhatsAppConversationRepositoryError) {
      return NextResponse.json({ message: error.message }, { status: errorStatus(error) });
    }
    return NextResponse.json(
      { message: 'Não foi possível concluir a operação com o contato.' },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
