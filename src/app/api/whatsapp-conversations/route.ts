import { NextResponse } from 'next/server';

import { WhatsAppConversationRepositoryError } from '@/features/whatsapp-conversations/application';
import {
  pollWhatsAppConversationForDashboard,
  pollWhatsAppConversationsForDashboard,
  searchWhatsAppMessagesForDashboard,
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

  const searchParams = new URL(request.url).searchParams;
  const conversationId = searchParams.get('conversationId')?.trim();
  const messageSearch = searchParams.get('messageSearch')?.trim();
  const rawMessagePage = Number.parseInt(searchParams.get('messagePage') ?? '1', 10);
  const messagePage =
    Number.isSafeInteger(rawMessagePage) && rawMessagePage > 0 ? rawMessagePage : 1;

  try {
    if (conversationId) {
      if (messageSearch) {
        if (messageSearch.length < 2 || messageSearch.length > 160) {
          return NextResponse.json(
            { message: 'Digite ao menos dois caracteres para pesquisar.' },
            { status: 400 },
          );
        }
        const result = await searchWhatsAppMessagesForDashboard(
          conversationId,
          messageSearch,
          messagePage,
        );
        if (!result) {
          return NextResponse.json({ message: 'Pesquisa inválida.' }, { status: 400 });
        }
        return NextResponse.json(result);
      }
      const conversation = await pollWhatsAppConversationForDashboard(conversationId, messagePage);

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
