import { NextResponse } from 'next/server';

import { WhatsAppConversationRepositoryError } from '@/features/whatsapp-conversations/application';
import { proxyWhatsAppMediaMessage } from '@/features/whatsapp-conversations/infrastructure';
import { executeAuthenticatedWhatsAppMutation } from '@/features/whatsapp-conversations/server';

export const dynamic = 'force-dynamic';

function errorStatus(error: WhatsAppConversationRepositoryError): number {
  if (error.code === 'unauthorized') return 401;
  if (error.code === 'forbidden') return 403;
  if (error.code === 'not-found') return 404;
  if (error.code === 'conflict') return 409;
  if (error.code === 'validation') return 400;
  return 503;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await context.params;

  try {
    return await executeAuthenticatedWhatsAppMutation(async (_repository, accessToken) => {
      const upstream = await proxyWhatsAppMediaMessage(accessToken, conversationId, request);
      const headers = new Headers({
        'Cache-Control': 'private, no-store',
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      });
      return new Response(upstream.body, { status: upstream.status, headers });
    });
  } catch (error) {
    if (error instanceof WhatsAppConversationRepositoryError) {
      return NextResponse.json({ message: error.message }, { status: errorStatus(error) });
    }
    return NextResponse.json(
      { message: 'Não foi possível enviar o anexo. Tente novamente.' },
      { status: 503 },
    );
  }
}
