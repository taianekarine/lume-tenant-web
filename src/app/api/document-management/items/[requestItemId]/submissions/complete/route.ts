import { NextResponse } from 'next/server';
import { z } from 'zod';

import { DocumentManagementError } from '@/features/document-management/application';
import { proxyDocumentUploadRequest } from '@/features/document-management/infrastructure';
import { executeAuthenticatedDocumentMutation } from '@/features/document-management/server';

export const dynamic = 'force-dynamic';

const identifierSchema = z.string().uuid();

function errorStatus(error: DocumentManagementError): number {
  if (error.code === 'unauthorized') return 401;
  if (error.code === 'forbidden') return 403;
  if (error.code === 'not-found') return 404;
  if (error.code === 'conflict') return 409;
  if (error.code === 'validation') return 400;
  return 503;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ requestItemId: string }> },
) {
  const parsedIdentifier = identifierSchema.safeParse((await context.params).requestItemId);
  if (!parsedIdentifier.success) {
    return NextResponse.json({ message: 'Documento inválido.' }, { status: 400 });
  }

  try {
    return await executeAuthenticatedDocumentMutation(async (_gateway, accessToken) => {
      const upstream = await proxyDocumentUploadRequest(
        accessToken,
        parsedIdentifier.data,
        request,
      );
      const headers = new Headers();
      headers.set('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
      headers.set('Cache-Control', 'private, no-store');
      return new Response(upstream.body, { status: upstream.status, headers });
    });
  } catch (error) {
    if (error instanceof DocumentManagementError) {
      return NextResponse.json({ message: error.message }, { status: errorStatus(error) });
    }
    return NextResponse.json(
      { message: 'Não foi possível enviar o documento. Tente novamente.' },
      { status: 503 },
    );
  }
}
