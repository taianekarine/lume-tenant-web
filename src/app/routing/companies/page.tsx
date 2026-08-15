import { Building2 } from 'lucide-react';

import { hasPermission } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';
import {
  createRoutingCompanyAction,
  deleteRoutingCompanyAction,
  updateRoutingCompanyAction,
} from '@/features/routing/actions';
import { RoutingEmpty, RoutingShell } from '@/features/routing/components';
import { executeAuthenticatedRoutingRequest } from '@/features/routing/server';
import { requireTenantSession } from '@/features/tenant-administration/server';
import { PageFeedbackToast } from '@/shared/page-feedback-toast';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export default async function RoutingCompaniesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireTenantSession([
    'routing-companies:view',
    'routing-companies:create',
    'routing-companies:update',
    'routing-companies:manage',
  ]);
  const query = await searchParams;
  const companies = hasPermission(session.user, 'routing-companies:view')
    ? await executeAuthenticatedRoutingRequest((gateway) => gateway.listCompanies())
    : { items: [], total: 0 };
  const canCreate = hasPermission(session.user, 'routing-companies:create');
  const canUpdate = hasPermission(session.user, 'routing-companies:update');
  const canManage = hasPermission(session.user, 'routing-companies:manage');

  return (
    <AuthenticatedShell user={session.user}>
      <RoutingShell
        title="Clientes"
        description="Pessoas fisicas ou juridicas atendidas pela Milenium. Cada cliente permanece vinculado ao tenant principal."
      >
        <PageFeedbackToast error={query.error} success={query.success} />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Cadastro de clientes</CardTitle>
              <CardDescription>
                {companies.total} cliente(s) no escopo do seu acesso.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              {companies.items.length === 0 ? (
                <RoutingEmpty>Nenhum cliente cadastrado.</RoutingEmpty>
              ) : (
                <div className="space-y-4">
                  {companies.items.map((company) => (
                    <article key={company.id} className="min-w-0 overflow-hidden rounded-xl border">
                      <div className="grid min-w-0 gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                        <div className="flex min-w-0 items-center gap-3">
                          <Building2 className="size-5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {company.tradeName || company.legalName}
                            </p>
                            {company.tradeName ? (
                              <p className="truncate text-xs text-muted-foreground">
                                {company.legalName}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <span className="break-all text-sm text-muted-foreground">
                          {company.taxId}
                        </span>
                        <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                          {company.status === 'active'
                            ? 'Ativo'
                            : company.status === 'suspended'
                              ? 'Suspenso'
                              : 'Inativo'}
                        </span>
                      </div>
                      {canUpdate || canManage ? (
                        <details className="border-t">
                          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-primary">
                            Editar / gerenciar
                          </summary>
                          <div className="min-w-0 space-y-5 border-t bg-muted/20 p-4">
                            {canUpdate ? (
                              <form
                                action={updateRoutingCompanyAction}
                                className="grid min-w-0 gap-4 sm:grid-cols-2"
                              >
                                <input type="hidden" name="routingCompanyId" value={company.id} />
                                <input
                                  type="hidden"
                                  name="expectedVersion"
                                  value={company.version}
                                />
                                <input type="hidden" name="status" value={company.status} />
                                <div className="min-w-0 space-y-2">
                                  <Label htmlFor={`tax-id-${company.id}`}>CNPJ/CPF</Label>
                                  <Input
                                    id={`tax-id-${company.id}`}
                                    name="taxId"
                                    defaultValue={company.taxId}
                                    required
                                  />
                                </div>
                                <div className="min-w-0 space-y-2">
                                  <Label htmlFor={`legal-name-${company.id}`}>
                                    Nome / razão social
                                  </Label>
                                  <Input
                                    id={`legal-name-${company.id}`}
                                    name="legalName"
                                    defaultValue={company.legalName}
                                    required
                                  />
                                </div>
                                <div className="min-w-0 space-y-2">
                                  <Label htmlFor={`trade-name-${company.id}`}>Nome fantasia</Label>
                                  <Input
                                    id={`trade-name-${company.id}`}
                                    name="tradeName"
                                    defaultValue={company.tradeName ?? ''}
                                  />
                                </div>
                                <div className="min-w-0 space-y-2">
                                  <Label htmlFor={`cost-center-${company.id}`}>
                                    Centro de custo
                                  </Label>
                                  <Input
                                    id={`cost-center-${company.id}`}
                                    name="costCenter"
                                    defaultValue={company.costCenter ?? ''}
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <Button size="sm" type="submit">
                                    Salvar alterações
                                  </Button>
                                </div>
                              </form>
                            ) : null}
                            {canManage ? (
                              <div className="grid min-w-0 gap-5 border-t pt-5 lg:grid-cols-2">
                                <form action={updateRoutingCompanyAction} className="space-y-2">
                                  <input type="hidden" name="routingCompanyId" value={company.id} />
                                  <input
                                    type="hidden"
                                    name="expectedVersion"
                                    value={company.version}
                                  />
                                  <input type="hidden" name="taxId" value={company.taxId} />
                                  <input type="hidden" name="legalName" value={company.legalName} />
                                  <input
                                    type="hidden"
                                    name="tradeName"
                                    value={company.tradeName ?? ''}
                                  />
                                  <input
                                    type="hidden"
                                    name="costCenter"
                                    value={company.costCenter ?? ''}
                                  />
                                  <input
                                    type="hidden"
                                    name="status"
                                    value={company.status === 'active' ? 'inactive' : 'active'}
                                  />
                                  <p className="text-sm font-medium">Situação do cliente</p>
                                  <Button size="sm" type="submit" variant="outline">
                                    {company.status === 'active'
                                      ? 'Desativar cliente'
                                      : 'Reativar cliente'}
                                  </Button>
                                </form>
                                <form
                                  action={deleteRoutingCompanyAction}
                                  className="min-w-0 space-y-2"
                                >
                                  <input type="hidden" name="routingCompanyId" value={company.id} />
                                  <Label htmlFor={`delete-password-${company.id}`}>
                                    Senha atual para excluir
                                  </Label>
                                  <Input
                                    id={`delete-password-${company.id}`}
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                  />
                                  <Button size="sm" type="submit" variant="destructive">
                                    Excluir definitivamente
                                  </Button>
                                  <p className="text-xs text-muted-foreground">
                                    Se houver usuários, contratos, colaboradores, rotas ou pontos
                                    exclusivos, desative o cliente para preservar o histórico.
                                  </p>
                                </form>
                              </div>
                            ) : null}
                          </div>
                        </details>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {canCreate ? (
            <Card>
              <CardHeader>
                <CardTitle>Novo cliente</CardTitle>
                <CardDescription>
                  Cadastre pessoa juridica pelo CNPJ ou pessoa fisica pelo CPF.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createRoutingCompanyAction} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-tax-id">CNPJ/CPF</Label>
                    <Input
                      id="company-tax-id"
                      name="taxId"
                      placeholder="00.000.000/0000-00 ou 000.000.000-00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-legal-name">Nome / Razao social</Label>
                    <Input id="company-legal-name" name="legalName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-trade-name">Nome fantasia</Label>
                    <Input id="company-trade-name" name="tradeName" />
                  </div>
                  <Button type="submit" className="w-full">
                    Cadastrar cliente
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </RoutingShell>
    </AuthenticatedShell>
  );
}
