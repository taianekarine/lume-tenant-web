import { CalendarDays } from 'lucide-react';

import { hasPermission } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';
import {
  ContractCreationForm,
  ContractRouteGenerationForm,
  RoutingEmpty,
  RoutingShell,
} from '@/features/routing/components';
import { executeAuthenticatedRoutingRequest } from '@/features/routing/server';
import { requireTenantSession } from '@/features/tenant-administration/server';
import { PageFeedbackToast } from '@/shared/page-feedback-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

const statusLabel = {
  draft: 'Rascunho',
  active: 'Ativo',
  suspended: 'Suspenso',
  ended: 'Encerrado',
} as const;
const periodicityLabel = {
  monthly: 'Mensal',
  weekly: 'Semanal',
  daily: 'Diario',
  'per-route': 'Por rota',
} as const;

export default async function RoutingContractsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireTenantSession([
    'routing-contracts:view',
    'routing-contracts:create',
    'routes:use',
  ]);
  const query = await searchParams;
  const canView = hasPermission(session.user, 'routing-contracts:view');
  const canCreate = hasPermission(session.user, 'routing-contracts:create');
  const canGenerate = hasPermission(session.user, 'routes:use');
  const [contracts, companies, fixedPoints] = await Promise.all([
    canView
      ? executeAuthenticatedRoutingRequest((gateway) => gateway.listContracts())
      : Promise.resolve({ items: [], total: 0 }),
    canCreate || canView
      ? executeAuthenticatedRoutingRequest((gateway) => gateway.listCompanies({ status: 'active' }))
      : Promise.resolve({ items: [], total: 0 }),
    canCreate
      ? executeAuthenticatedRoutingRequest((gateway) =>
          gateway.listFixedPoints({ status: 'active' }),
        )
      : Promise.resolve({ items: [], total: 0 }),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AuthenticatedShell user={session.user}>
      <RoutingShell
        title="Contratos operacionais"
        description="O contrato e a entidade principal: concentra o acordo comercial que limita a selecao de colaboradores e a sugestao das rotas."
      >
        <PageFeedbackToast error={query.error} success={query.success} />
        <Card>
          <CardHeader>
            <CardTitle>Contratos cadastrados</CardTitle>
            <CardDescription>
              Gere rotas somente a partir de contratos ativos e vigentes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contracts.items.length === 0 ? (
              <RoutingEmpty>Nenhum contrato disponivel.</RoutingEmpty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Unidade / turnos</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Veiculos / capacidade</TableHead>
                    <TableHead>Situacao</TableHead>
                    <TableHead className="text-right">Acao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.items.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <p className="font-medium">{contract.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {contract.code} - {periodicityLabel[contract.periodicity]}
                        </p>
                      </TableCell>
                      <TableCell>
                        {contract.unitName}
                        <p className="text-xs text-muted-foreground">
                          {contract.shifts
                            .map((shift) => `${shift.name} ${shift.requiredArrivalTime}`)
                            .join(', ')}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-4" />
                          {contract.validFrom}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          ate {contract.validUntil || 'sem termino'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {contract.contractedVehicleCount} / {contract.predictedVehicleCapacity}{' '}
                        lugares por veiculo
                      </TableCell>
                      <TableCell>{statusLabel[contract.status]}</TableCell>
                      <TableCell className="text-right">
                        {canGenerate && contract.status === 'active' ? (
                          <ContractRouteGenerationForm contract={contract} referenceDate={today} />
                        ) : (
                          '—'
                        )}
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
              <CardTitle>Novo contrato</CardTitle>
              <CardDescription>
                Selecione pontos fixos, configure um ou mais turnos e mantenha centros de custo
                apenas na operacao interna.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContractCreationForm companies={companies.items} fixedPoints={fixedPoints.items} />
            </CardContent>
          </Card>
        ) : null}
      </RoutingShell>
    </AuthenticatedShell>
  );
}
