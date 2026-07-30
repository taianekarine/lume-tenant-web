import { NextResponse } from 'next/server';

import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { QuoteProposalRepositoryError } from '@/features/quote-proposals/application';
import { downloadQuoteProposalDocumentForDashboard } from '@/features/quote-proposals/server';
import { canReadQuoteProposals } from '@/features/quote-proposals/server/quote-proposal-access';

interface RouteContext {
  readonly params: Promise<{
    readonly quoteRequestId: string;
    readonly documentId: string;
  }>;
}

function contentDisposition(fileName: string): string {
  const fallback =
    fileName
      .normalize('NFKD')
      .replace(/[^\x20-\x7e]/g, '')
      .replace(/["\\\r\n]/g, '_')
      .slice(0, 180) || 'proposta.pdf';
  return `inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getCurrentAuthenticatedSession();
  if (session === null || !canReadQuoteProposals(session.user)) {
    return NextResponse.json(
      { message: 'Você não tem acesso a este documento.' },
      { status: session === null ? 401 : 403 },
    );
  }

  const { quoteRequestId, documentId } = await context.params;
  try {
    const document = await downloadQuoteProposalDocumentForDashboard(quoteRequestId, documentId);
    const buffer = new ArrayBuffer(document.bytes.byteLength);
    new Uint8Array(buffer).set(document.bytes);
    return new Response(buffer, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': contentDisposition(document.fileName),
        'Content-Length': String(document.bytes.byteLength),
        'Content-Type': document.mimeType,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const status =
      error instanceof QuoteProposalRepositoryError
        ? error.code === 'not-found'
          ? 404
          : error.code === 'forbidden'
            ? 403
            : error.code === 'unauthorized'
              ? 401
              : 502
        : 502;
    return NextResponse.json(
      { message: 'Não foi possível carregar o PDF da proposta.' },
      { status },
    );
  }
}
