import { redirect } from 'next/navigation';

import { DocumentManagementError } from '@/features/document-management/application';
import { DocumentRequestWorkspace } from '@/features/document-management/components';
import {
  executeAuthenticatedDocumentRequest,
  requireDocumentSession,
} from '@/features/document-management/server';
import { AuthenticatedShell } from '@/features/navigation';

export default async function ManagedDocumentRequestPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ requestId: string }>;
  readonly searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireDocumentSession(true);
  const { requestId } = await params;
  const query = await searchParams;
  let request;
  let documentTypes;
  try {
    [request, documentTypes] = await Promise.all([
      executeAuthenticatedDocumentRequest((gateway) => gateway.getRequest(requestId)),
      executeAuthenticatedDocumentRequest((gateway) => gateway.listDocumentTypes()),
    ]);
  } catch (error) {
    if (error instanceof DocumentManagementError && error.code === 'unauthorized') {
      redirect('/auth/session-expired');
    }
    redirect('/document-management?error=Não foi possível abrir a solicitação.');
  }
  const returnPath = `/document-management/${requestId}`;

  return (
    <AuthenticatedShell user={session.user}>
      <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
        {query.error || query.success ? (
          <p
            role={query.error ? 'alert' : 'status'}
            className={
              query.error
                ? 'rounded-lg bg-destructive/10 p-3 text-sm text-destructive'
                : 'rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700'
            }
          >
            {query.error ?? query.success}
          </p>
        ) : null}
        <DocumentRequestWorkspace
          request={request}
          canReview
          returnPath={returnPath}
          documentTypes={documentTypes}
        />
      </main>
    </AuthenticatedShell>
  );
}
