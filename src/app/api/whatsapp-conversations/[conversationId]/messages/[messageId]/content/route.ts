import { NextResponse } from 'next/server';

import { hasPermission } from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { WhatsAppConversationRepositoryError } from '@/features/whatsapp-conversations/application';
import { downloadWhatsAppMessageMediaForDashboard } from '@/features/whatsapp-conversations/server';

export const dynamic = 'force-dynamic';

interface RouteContext {
  readonly params: Promise<{
    readonly conversationId: string;
    readonly messageId: string;
  }>;
}

function contentDisposition(
  fileName: string,
  disposition: 'inline' | 'attachment',
): string {
  const fallback =
    fileName
      .normalize('NFKD')
      .replace(/[^\x20-\x7e]/g, '')
      .replace(/["\\\r\n]/g, '_')
      .slice(0, 180) || 'whatsapp-media';
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function errorStatus(error: WhatsAppConversationRepositoryError): number {
  if (error.code === 'unauthorized') return 401;
  if (error.code === 'forbidden') return 403;
  if (error.code === 'not-found') return 404;
  if (error.code === 'validation') return 400;
  return 502;
}

export async function GET(request: Request, context: RouteContext) {
  const session = await getCurrentAuthenticatedSession();
  const canRead =
    session !== null &&
    (hasPermission(session.user, 'whatsapp-conversations:view') ||
      hasPermission(session.user, 'whatsapp-conversations:manage'));

  if (!canRead) {
    return NextResponse.json(
      { message: 'Você não tem acesso a esta mídia do WhatsApp.' },
      { status: session === null ? 401 : 403 },
    );
  }

  const { conversationId, messageId } = await context.params;
  try {
    const media = await downloadWhatsAppMessageMediaForDashboard(
      conversationId,
      messageId,
    );
    const buffer = new ArrayBuffer(media.bytes.byteLength);
    new Uint8Array(buffer).set(media.bytes);
    const shouldDownload =
      new URL(request.url).searchParams.get('download') === '1';

    return new Response(buffer, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': contentDisposition(
          media.fileName,
          shouldDownload ? 'attachment' : 'inline',
        ),
        'Content-Length': String(media.bytes.byteLength),
        'Content-Type': media.mimeType,
        'Cross-Origin-Resource-Policy': 'same-origin',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof WhatsAppConversationRepositoryError) {
      return NextResponse.json(
        { message: error.message },
        { status: errorStatus(error) },
      );
    }

    return NextResponse.json(
      { message: 'Não foi possível carregar a mídia do WhatsApp.' },
      { status: 502 },
    );
  }
}
