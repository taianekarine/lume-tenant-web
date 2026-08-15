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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

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
          <Card>
            <CardHeader>
              <CardTitle>Cadastro de clientes</CardTitle>
              <CardDescription>
                {companies.total} cliente(s) no escopo do seu acesso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {companies.items.length === 0 ? (
                <RoutingEmpty>Nenhum cliente cadastrado.</RoutingEmpty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>CNPJ/CPF</TableHead>
                      <TableHead>Situacao</TableHead>
                      {(canUpdate || canManage) && <TableHead>Acoes</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.items.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="size-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {company.tradeName || company.legalName}
                              </p>
                              {company.tradeName ? (
                                <p className="text-xs text-muted-foreground">{company.legalName}</p>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{company.taxId}</TableCell>
                        <TableCell>
                          {company.status === 'active'
                            ? 'Ativo'
                            : company.status === 'suspended'
                              ? 'Suspenso'
                              : 'Inativo'}
                        </TableCell>
                        {canUpdate || canManage ? (
                          <TableCell>
                            <details className="min-w-64">
                              <summary className="cursor-pointer text-sm font-medium text-primary">
                                Editar / gerenciar
                              </summary>
                              <div className="mt-3 space-y-4 rounded-lg border p-3">
                                {canUpdate ? (
                                  <form action={updateRoutingCompanyAction} className="space-y-3">
                                    <input
                                      type="hidden"
                                      name="routingCompanyId"
                                      value={company.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="expectedVersion"
                                      value={company.version}
                                    />
                                    <input type="hidden" name="status" value={company.status} />
                                    <Input
                                      name="taxId"
                                      defaultValue={company.taxId}
                                      aria-label="CNPJ ou CPF"
                                      required
                                    />
                                    <Input
                                      name="legalName"
                                      defaultValue={company.legalName}
                                      aria-label="Nome ou razao social"
                                      required
                                    />
                                    <Input
                                      name="tradeName"
                                      defaultValue={company.tradeName ?? ''}
                                      aria-label="Nome fantasia"
                                    />
                                    <Input
                                      name="costCenter"
                                      defaultValue={company.costCenter ?? ''}
                                      aria-label="Centro de custo"
                                    />
                                    <Button size="sm" type="submit">
                                      Salvar alteracoes
                                    </Button>
                                  </form>
                                ) : null}
                                {canManage ? (
                                  <form action={updateRoutingCompanyAction}>
                                    <input
                                      type="hidden"
                                      name="routingCompanyId"
                                      value={company.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="expectedVersion"
                                      value={company.version}
                                    />
                                    <input type="hidden" name="taxId" value={company.taxId} />
                                    <input
                                      type="hidden"
                                      name="legalName"
                                      value={company.legalName}
                                    />
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
                                    <Button size="sm" type="submit" variant="outline">
                                      {company.status === 'active'
                                        ? 'Desativar cliente'
                                        : 'Reativar cliente'}
                                    </Button>
                                  </form>
                                ) : null}
                                {canManage ? (
                                  <form
                                    action={deleteRoutingCompanyAction}
                                    className="space-y-2 border-t pt-3"
                                  >
                                    <input
                                      type="hidden"
                                      name="routingCompanyId"
                                      value={company.id}
                                    />
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
                                      Se houver usuarios, contratos, colaboradores, rotas ou pontos
                                      exclusivos, o cliente deve ser desativado para preservar o
                                      historico.
                                    </p>
                                  </form>
                                ) : null}
                              </div>
                            </details>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
