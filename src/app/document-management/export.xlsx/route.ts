import { DocumentManagementError } from '@/features/document-management/application';
import {
  executeAuthenticatedDocumentRequest,
  requireDocumentSession,
} from '@/features/document-management/server';

export async function GET(): Promise<Response> {
  await requireDocumentSession(true);

  try {
    const upstream = await executeAuthenticatedDocumentRequest((gateway) =>
      gateway.downloadExport(),
    );
    const headers = new Headers();
    headers.set(
      'Content-Type',
      upstream.headers.get('content-type') ??
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    headers.set(
      'Content-Disposition',
      upstream.headers.get('content-disposition') ??
        'attachment; filename="gestao-documental.xlsx"',
    );
    headers.set('Cache-Control', 'private, no-store');
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    const status =
      error instanceof DocumentManagementError
        ? error.code === 'unauthorized'
          ? 401
          : error.code === 'forbidden'
            ? 403
            : 502
        : 500;
    return Response.json(
      { error: 'Não foi possível gerar a exportação documental.' },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
