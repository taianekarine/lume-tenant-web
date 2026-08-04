import { redirect } from 'next/navigation';

import { createDocumentRequestAction } from '@/features/document-management/actions';
import { DocumentManagementError } from '@/features/document-management/application';
import { DocumentRequestList } from '@/features/document-management/components';
import {
  DOCUMENT_CONTEXT_LABELS,
  type DocumentChecklistSummary,
  type DocumentRequestList as DocumentRequestListType,
} from '@/features/document-management/domain';
import {
  executeAuthenticatedDocumentRequest,
  requireDocumentSession,
} from '@/features/document-management/server';
import { AuthenticatedShell } from '@/features/navigation';
import type { TenantUserList } from '@/features/tenant-administration/domain';
import { executeAuthenticatedTenantRequest } from '@/features/tenant-administration/server';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

export default async function DocumentManagementPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireDocumentSession(true);
  const query = await searchParams;
  let requests: DocumentRequestListType;
  let checklists: readonly DocumentChecklistSummary[];
  let users: TenantUserList;
  const serviceErrors: string[] = [];
  const [requestsResult, checklistsResult, usersResult] = await Promise.allSettled([
      executeAuthenticatedDocumentRequest((gateway) => gateway.listRequests({ pageSize: 50 })),
      executeAuthenticatedDocumentRequest((gateway) => gateway.listChecklists()),
      executeAuthenticatedTenantRequest((gateway) => gateway.listUsers({ pageSize: 100 })),
  ]);
  for (const result of [requestsResult, checklistsResult]) {
    if (result.status === 'rejected' && result.reason instanceof DocumentManagementError && result.reason.code === 'unauthorized') {
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
  if (checklistsResult.status === 'fulfilled') checklists = checklistsResult.value;
  else {
    checklists = [];
    serviceErrors.push('Não foi possível carregar as listas de documentos.');
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
          <Card><CardHeader><CardTitle>1. Cadastro</CardTitle><CardDescription>RH/DP escolhe a lista Geral, Administrativo ou Motorista ao criar o usuário.</CardDescription></CardHeader></Card>
          <Card><CardHeader><CardTitle>2. Acompanhamento</CardTitle><CardDescription>Esta tela mostra pendências, envios, revisões, reenvios e vencimentos.</CardDescription></CardHeader></Card>
          <Card><CardHeader><CardTitle>3. Extração e download</CardTitle><CardDescription>Abra uma solicitação para confirmar os dados e baixar XLSX e arquivos daquele usuário.</CardDescription></CardHeader></Card>
        </div>
        {serviceErrors.length ? (
          <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {serviceErrors.map((message) => <p key={message}>{message}</p>)}
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
            <p className="text-sm text-muted-foreground">Use somente para complemento, atualização ou regularização fora do cadastro inicial.</p>
          </summary>
          <CardContent>
            <form
              action={createDocumentRequestAction}
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
            >
              <label className="space-y-1 text-sm font-medium">
                <span>Titular</span>
                <select
                  name="subjectUserId"
                  required
                  className="h-9 w-full rounded-lg border bg-background px-3"
                >
                  <option value="">Selecione</option>
                  {users.data.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} · {user.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium">
                <span>Checklist</span>
                <select
                  name="checklistId"
                  required
                  className="h-9 w-full rounded-lg border bg-background px-3"
                >
                  <option value="">Selecione</option>
                  {checklists
                    .filter((item) => item.active)
                    .map((checklist) => (
                      <option key={checklist.id} value={checklist.id}>
                        {checklist.name} · v{checklist.version}
                      </option>
                    ))}
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium">
                <span>Contexto</span>
                <select
                  name="context"
                  required
                  className="h-9 w-full rounded-lg border bg-background px-3"
                >
                  {Object.entries(DOCUMENT_CONTEXT_LABELS).map(([context, label]) => (
                    <option key={context} value={context}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium">
                <span>Prazo</span>
                <Input name="deadline" type="datetime-local" />
              </label>
              <label className="space-y-1 text-sm font-medium md:col-span-2 xl:col-span-3">
                <span>Observações</span>
                <Textarea name="notes" maxLength={2000} />
              </label>
              <div className="flex items-end">
                <Button type="submit">Criar solicitação</Button>
              </div>
            </form>
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
