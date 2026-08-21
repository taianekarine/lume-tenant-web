import { MapPin, Plus } from 'lucide-react';

import { hasPermission } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';
import { createFixedPointAction } from '@/features/routing/actions';
import { RoutingEmpty, RoutingShell } from '@/features/routing/components';
import { executeAuthenticatedRoutingRequest } from '@/features/routing/server';
import { requireTenantSession } from '@/features/tenant-administration/server';
import { PostalCodeAddressFields } from '@/shared/address';
import { PageFeedbackToast } from '@/shared/page-feedback-toast';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

export default async function FixedPointsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    search?: string;
    routingCompanyId?: string;
    routeId?: string;
    error?: string;
    success?: string;
  }>;
}) {
  const session = await requireTenantSession([
    'routing-contracts:view',
    'routing-contracts:create',
    'routes:view',
  ]);
  const query = await searchParams;
  const [points, companies, routes] = await Promise.all([
    executeAuthenticatedRoutingRequest((gateway) =>
      gateway.listFixedPoints({
        search: query.search,
        routingCompanyId: query.routingCompanyId,
        routeId: query.routeId,
        status: 'active',
      }),
    ),
    executeAuthenticatedRoutingRequest((gateway) => gateway.listCompanies({ status: 'active' })),
    hasPermission(session.user, 'routes:view')
      ? executeAuthenticatedRoutingRequest((gateway) => gateway.listRoutes())
      : Promise.resolve({ items: [], total: 0 }),
  ]);
  const canCreate =
    hasPermission(session.user, 'routing-contracts:create') ||
    hasPermission(session.user, 'routes:update');
  const clientName = (id: string | null) => {
    if (!id) return 'Todos os clientes';
    const client = companies.items.find((item) => item.id === id);
    return client?.tradeName || client?.legalName || 'Cliente';
  };

  return (
    <AuthenticatedShell user={session.user}>
      <RoutingShell
        title="Pontos fixos"
        description="Cadastre locais reutilizaveis. Cada ponto recebe um codigo automatico e pode ficar disponivel para todos ou exclusivo de um cliente."
      >
        <PageFeedbackToast error={query.error} success={query.success} />
        <Card>
          <CardHeader>
            <CardTitle>Localizar pontos</CardTitle>
            <CardDescription>Filtre por nome ou codigo, cliente e rota sugerida.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-4">
              <Input name="search" defaultValue={query.search} placeholder="Nome ou codigo" />
              <select
                name="routingCompanyId"
                defaultValue={query.routingCompanyId ?? ''}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Todos os clientes</option>
                {companies.items.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.tradeName || company.legalName}
                  </option>
                ))}
              </select>
              <select
                name="routeId"
                defaultValue={query.routeId ?? ''}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Todas as rotas</option>
                {routes.items.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline">
                Filtrar
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pontos cadastrados</CardTitle>
            <CardDescription>{points.total} ponto(s) encontrado(s).</CardDescription>
          </CardHeader>
          <CardContent>
            {points.items.length === 0 ? (
              <RoutingEmpty>Nenhum ponto fixo encontrado.</RoutingEmpty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Ponto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Endereco</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {points.items.map((point) => (
                    <TableRow key={point.id}>
                      <TableCell className="font-mono text-xs">{point.code}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2 font-medium">
                          <MapPin className="size-4 text-primary" />
                          {point.name}
                        </span>
                      </TableCell>
                      <TableCell>{clientName(point.routingCompanyId)}</TableCell>
                      <TableCell>
                        {point.address.street}, {point.address.number} - {point.address.city}/
                        {point.address.state}
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
              <CardTitle>Novo ponto fixo</CardTitle>
              <CardDescription>
                Deixe o cliente em branco para compartilhar o ponto com todos os contratos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createFixedPointAction} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fixed-point-name">Nome do ponto</Label>
                    <Input id="fixed-point-name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fixed-point-client">Exclusividade</Label>
                    <select
                      id="fixed-point-client"
                      name="routingCompanyId"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">Nao exclusivo (todos os clientes)</option>
                      {companies.items.map((company) => (
                        <option key={company.id} value={company.id}>
                          Exclusivo de {company.tradeName || company.legalName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <PostalCodeAddressFields
                  prefix="address"
                  title="Endereco do ponto"
                  showPointName={false}
                />
                <div className="flex justify-end">
                  <Button type="submit">
                    <Plus className="size-4" />
                    Cadastrar ponto
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </RoutingShell>
    </AuthenticatedShell>
  );
}
