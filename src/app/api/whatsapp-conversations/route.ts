import { NextResponse } from 'next/server';

import { WhatsAppConversationRepositoryError } from '@/features/whatsapp-conversations/application';
import {
  pollWhatsAppConversationForDashboard,
  pollWhatsAppConversationsForDashboard,
} from '@/features/whatsapp-conversations/server';
import { hasPermission } from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';

export const dynamic = 'force-dynamic';

function errorStatus(error: WhatsAppConversationRepositoryError): number {
  if (error.code === 'unauthorized') return 401;
  if (error.code === 'forbidden') return 403;
  if (error.code === 'not-found') return 404;
  if (error.code === 'conflict') return 409;
  if (error.code === 'validation') return 400;
  return 503;
}

export async function GET(request: Request) {
  const session = await getCurrentAuthenticatedSession();

  if (session === null || !hasPermission(session.user, 'whatsapp-conversations:manage')) {
    return NextResponse.json(
      { message: 'Acesso não autorizado ao painel de WhatsApp.' },
      { status: session === null ? 401 : 403 },
    );
  }

  const conversationId = new URL(request.url).searchParams.get('conversationId')?.trim();

  try {
    if (conversationId) {
      const conversation = await pollWhatsAppConversationForDashboard(conversationId);

      if (conversation === null) {
        return NextResponse.json({ message: 'Conversa não encontrada.' }, { status: 404 });
      }

      return NextResponse.json({ conversation });
    }

    const conversations = await pollWhatsAppConversationsForDashboard();
    return NextResponse.json({ conversations });
  } catch (error) {
    if (error instanceof WhatsAppConversationRepositoryError) {
      return NextResponse.json({ message: error.message }, { status: errorStatus(error) });
    }

    return NextResponse.json(
      { message: 'Não foi possível consultar a Tenant API.' },
      { status: 503 },
    );
  }
}
