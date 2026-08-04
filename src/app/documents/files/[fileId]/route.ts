import { DocumentManagementError } from '@/features/document-management/application';
import { executeAuthenticatedDocumentRequest } from '@/features/document-management/server';

export async function GET(
  _request: Request,
  { params }: { readonly params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  try {
    const source = await executeAuthenticatedDocumentRequest((gateway) => gateway.getFile(fileId));
    const headers = new Headers();
    for (const name of [
      'content-type',
      'content-length',
      'content-disposition',
      'x-content-sha256',
    ]) {
      const value = source.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set('Cache-Control', 'private, no-store');
    return new Response(source.body, { status: 200, headers });
  } catch (error) {
    const status =
      error instanceof DocumentManagementError
        ? error.code === 'unauthorized'
          ? 401
          : error.code === 'forbidden'
            ? 403
            : error.code === 'not-found'
              ? 404
              : 502
        : 500;
    return Response.json({ message: 'Não foi possível abrir o documento.' }, { status });
  }
}
