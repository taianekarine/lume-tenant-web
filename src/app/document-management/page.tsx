import { redirect } from 'next/navigation';

import { DocumentManagementError } from '@/features/document-management/application';
import {
  BatchDocumentRequestForm,
  DocumentRequestList,
} from '@/features/document-management/components';
import {
  type DocumentRequestList as DocumentRequestListType,
  type DocumentTypeSummary,
} from '@/features/document-management/domain';
import {
  executeAuthenticatedDocumentRequest,
  requireDocumentSession,
} from '@/features/document-management/server';
import { AuthenticatedShell } from '@/features/navigation';
import type { TenantUserList } from '@/features/tenant-administration/domain';
import { executeAuthenticatedTenantRequest } from '@/features/tenant-administration/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

export default async function DocumentManagementPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireDocumentSession(true);
  const query = await searchParams;
  let requests: DocumentRequestListType;
  let documentTypes: readonly DocumentTypeSummary[];
  let users: TenantUserList;
  const serviceErrors: string[] = [];
  const [requestsResult, documentTypesResult, usersResult] = await Promise.allSettled([
    executeAuthenticatedDocumentRequest((gateway) => gateway.listRequests({ pageSize: 50 })),
    executeAuthenticatedDocumentRequest((gateway) => gateway.listDocumentTypes()),
    executeAuthenticatedTenantRequest((gateway) => gateway.listUsers({ pageSize: 100 })),
  ]);
  for (const result of [requestsResult, documentTypesResult]) {
    if (
      result.status === 'rejected' &&
      result.reason instanceof DocumentManagementError &&
      result.reason.code === 'unauthorized'
    ) {
      redirect('/auth/session-expired');
    }
  }
  if (requestsResult.status === 'fulfilled') requests = requestsResult.value;
  else {
    requests = {
      data: [],
      meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
    };
    serviceErrors.push('Não foi possível carregar as solicitações em acompanhamento.');
  }
  if (documentTypesResult.status === 'fulfilled') documentTypes = documentTypesResult.value;
  else {
    documentTypes = [];
    serviceErrors.push('Não foi possível carregar os tipos de documentos.');
  }
  if (usersResult.status === 'fulfilled') users = usersResult.value;
  else {
    users = {
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    };
    serviceErrors.push('Não foi possível carregar os titulares.');
  }

  return (
    <AuthenticatedShell user={session.user}>
      <main className="mx-auto w-full max-w-[1600px] space-y-6 p-4 md:p-6">
        <header>
          <div>
            <p className="text-sm font-medium text-primary">RH e Departamento Pessoal</p>
            <h1 className="text-2xl font-bold tracking-tight">Gestão documental</h1>
            <p className="text-sm text-muted-foreground">
              Solicite, acompanhe, revise e renove documentos sem aprovação automática.
            </p>
          </div>
        </header>
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>1. Cadastro</CardTitle>
              <CardDescription>
                RH/DP informa o perfil; a lista documental é calculada automaticamente sem duplicar
                documentos.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2. Acompanhamento</CardTitle>
              <CardDescription>
                Esta tela mostra pendências, envios, revisões, reenvios e vencimentos.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>3. Extração e download</CardTitle>
              <CardDescription>
                Abra uma solicitação para confirmar os dados e baixar XLSX e arquivos daquele
                usuário.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
        {serviceErrors.length ? (
          <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {serviceErrors.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}
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

        <Card>
          <details>
            <summary className="cursor-pointer list-none p-6">
              <p className="font-semibold">Criar solicitação avulsa</p>
              <p className="text-sm text-muted-foreground">
                Escolha os documentos uma vez e envie solicitações individuais para um ou mais
                usuários.
              </p>
            </summary>
            <CardContent>
              <BatchDocumentRequestForm users={users.data} documentTypes={documentTypes} />
            </CardContent>
          </details>
        </Card>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Solicitações em acompanhamento</h2>
          <DocumentRequestList requests={requests.data} management />
        </section>
      </main>
    </AuthenticatedShell>
  );
}
