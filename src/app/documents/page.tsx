import { redirect } from 'next/navigation';

import { DocumentManagementError } from '@/features/document-management/application';
import { DocumentRequestList } from '@/features/document-management/components';
import {
  executeAuthenticatedDocumentRequest,
  requireDocumentSession,
} from '@/features/document-management/server';
import type { DocumentRequestList as DocumentRequestListType } from '@/features/document-management/domain';
import { AuthenticatedShell } from '@/features/navigation';

export default async function DocumentsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; success?: string; page?: string }>;
}) {
  const session = await requireDocumentSession();
  const query = await searchParams;
  let requests: DocumentRequestListType;
  try {
    requests = await executeAuthenticatedDocumentRequest((gateway) =>
      gateway.listRequests({ page: Math.max(1, Number(query.page) || 1), pageSize: 20 }),
    );
  } catch (error) {
    if (error instanceof DocumentManagementError && error.code === 'unauthorized') {
      redirect('/auth/session-expired');
    }
    requests = { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
  }

  return (
    <AuthenticatedShell user={session.user}>
      <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
        <header>
          <p className="text-sm font-medium text-primary">Área segura</p>
          <h1 className="text-2xl font-bold tracking-tight">Meus documentos</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe prazos, pendências, recusas, renovações e o progresso de cada checklist.
          </p>
        </header>
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
        <DocumentRequestList requests={requests.data} />
      </main>
    </AuthenticatedShell>
  );
}
