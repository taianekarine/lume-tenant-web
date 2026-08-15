import { Building2 } from 'lucide-react';

import { hasPermission } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';
import { createRoutingCompanyAction } from '@/features/routing/actions';
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
  ]);
  const query = await searchParams;
  const companies = hasPermission(session.user, 'routing-companies:view')
    ? await executeAuthenticatedRoutingRequest((gateway) => gateway.listCompanies())
    : { items: [], total: 0 };
  const canCreate = hasPermission(session.user, 'routing-companies:create');

  return (
    <AuthenticatedShell user={session.user}>
      <RoutingShell
        title="Empresas atendidas"
        description="Estas empresas são clientes atendidos pela Milenium e permanecem isoladas do tenant principal."
      >
        <PageFeedbackToast error={query.error} success={query.success} />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Card>
            <CardHeader>
              <CardTitle>Cadastro de empresas</CardTitle>
              <CardDescription>
                {companies.total} empresa(s) no escopo do seu acesso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {companies.items.length === 0 ? (
                <RoutingEmpty>Nenhuma empresa atendida cadastrada.</RoutingEmpty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Situação</TableHead>
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
                            ? 'Ativa'
                            : company.status === 'suspended'
                              ? 'Suspensa'
                              : 'Inativa'}
                        </TableCell>
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
                <CardTitle>Nova empresa</CardTitle>
                <CardDescription>
                  Cadastre primeiro a empresa que terá contratos e colaboradores transportados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createRoutingCompanyAction} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-tax-id">CNPJ</Label>
                    <Input
                      id="company-tax-id"
                      name="taxId"
                      placeholder="00.000.000/0000-00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-legal-name">Razão social</Label>
                    <Input id="company-legal-name" name="legalName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-trade-name">Nome fantasia</Label>
                    <Input id="company-trade-name" name="tradeName" />
                  </div>
                  <Button type="submit" className="w-full">
                    Cadastrar empresa
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
