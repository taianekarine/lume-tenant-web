import { NextResponse } from 'next/server';

import { WhatsAppConversationRepositoryError } from '@/features/whatsapp-conversations/application';
import { executeAuthenticatedWhatsAppMutation } from '@/features/whatsapp-conversations/server';
import { proxyWhatsAppHistoryImportRequest } from '@/features/whatsapp-history-import/infrastructure';
import { resolveWhatsAppHistoryImportPath } from '@/features/whatsapp-history-import/infrastructure/whatsapp-history-import-route';

export const dynamic = 'force-dynamic';

function errorStatus(error: WhatsAppConversationRepositoryError): number {
  if (error.code === 'unauthorized') return 401;
  if (error.code === 'forbidden') return 403;
  if (error.code === 'not-found') return 404;
  if (error.code === 'conflict') return 409;
  if (error.code === 'validation') return 400;
  return 503;
}

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const upstreamPath = resolveWhatsAppHistoryImportPath(
    request.method,
    (await context.params).path,
  );
  if (upstreamPath === null) {
    return NextResponse.json({ message: 'Rota de importação inválida.' }, { status: 404 });
  }

  try {
    return await executeAuthenticatedWhatsAppMutation(async (_repository, accessToken) => {
      const upstream = await proxyWhatsAppHistoryImportRequest(accessToken, request, upstreamPath);
      const headers = new Headers({ 'Cache-Control': 'private, no-store' });
      for (const name of ['content-type', 'content-disposition', 'content-length']) {
        const value = upstream.headers.get(name);
        if (value) headers.set(name, value);
      }
      return new Response(upstream.body, { status: upstream.status, headers });
    });
  } catch (error) {
    if (error instanceof WhatsAppConversationRepositoryError) {
      return NextResponse.json({ message: error.message }, { status: errorStatus(error) });
    }
    return NextResponse.json(
      { message: 'Não foi possível concluir a importação. Tente novamente.' },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
