import { Accessibility } from 'lucide-react';
import { Fragment } from 'react';

import { hasPermission } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';
import {
  PassengerEditor,
  PassengerImportPanel,
  RoutingEmpty,
  RoutingShell,
} from '@/features/routing/components';
import { executeAuthenticatedRoutingRequest } from '@/features/routing/server';
import { requireTenantSession } from '@/features/tenant-administration/server';
import { PageFeedbackToast } from '@/shared/page-feedback-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

export default async function RoutingPassengersPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; success?: string; batchId?: string }>;
}) {
  const session = await requireTenantSession([
    'passengers:view',
    'passengers:import',
    'passengers:update',
  ]);
  const query = await searchParams;
  const canView = hasPermission(session.user, 'passengers:view');
  const canImport = hasPermission(session.user, 'passengers:import');
  const canUpdate = hasPermission(session.user, 'passengers:update');
  const [passengers, companies, imported, contracts] = await Promise.all([
    canView
      ? executeAuthenticatedRoutingRequest((gateway) => gateway.listPassengers({ pageSize: 100 }))
      : Promise.resolve({ items: [], total: 0 }),
    canImport
      ? executeAuthenticatedRoutingRequest((gateway) => gateway.listCompanies({ status: 'active' }))
      : Promise.resolve({ items: [], total: 0 }),
    query.batchId && canImport
      ? executeAuthenticatedRoutingRequest((gateway) => gateway.getPassengerImport(query.batchId!))
      : Promise.resolve(null),
    canUpdate
      ? executeAuthenticatedRoutingRequest((gateway) => gateway.listContracts({ status: 'active' }))
      : Promise.resolve({ items: [], total: 0 }),
  ]);
  const passengerById = new Map(passengers.items.map((passenger) => [passenger.id, passenger]));
  const contractShifts = (routingCompanyId: string) =>
    contracts.items
      .filter((contract) => contract.routingCompanyId === routingCompanyId)
      .flatMap((contract) => contract.shifts);

  return (
    <AuthenticatedShell user={session.user}>
      <RoutingShell
        title="Colaboradores transportados"
        description="Escolha o cliente na aplicacao, baixe o modelo simples e importe a lista. Pendencias de CEP podem ser corrigidas na propria tela."
      >
        <PageFeedbackToast error={query.error} success={query.success} />
        {canImport ? (
          <Card>
            <CardHeader>
              <CardTitle>Modelo e importacao</CardTitle>
              <CardDescription>
                O modelo nao exige CNPJ/CPF por linha, coordenadas, endereco fragmentado do ponto
                nem JSON.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PassengerImportPanel companies={companies.items} />
            </CardContent>
          </Card>
        ) : null}
        {imported ? (
          <Card>
            <CardHeader>
              <CardTitle>Resultado da importacao</CardTitle>
              <CardDescription>
                {imported.batch.createdCount} criado(s), {imported.batch.updatedCount}{' '}
                atualizado(s), {imported.batch.pendingCount} pendente(s) e{' '}
                {imported.batch.conflictCount} conflito(s).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {imported.records.filter(
                (record) => record.action === 'pending' || record.action === 'conflict',
              ).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todas as linhas foram processadas sem pendencias.
                </p>
              ) : (
                imported.records
                  .filter((record) => record.action === 'pending' || record.action === 'conflict')
                  .map((record) => {
                    const fullName =
                      typeof record.payload.fullName === 'string'
                        ? record.payload.fullName
                        : 'Colaborador';
                    const passenger = record.passengerId
                      ? passengerById.get(record.passengerId)
                      : null;
                    return (
                      <div key={record.id} className="space-y-3 rounded-lg border p-4">
                        <div>
                          <p className="font-medium">
                            Linha {record.rowNumber}: {fullName}
                          </p>
                          {record.problems.map((problem) => (
                            <p
                              key={`${problem.field}-${problem.reason}`}
                              className="text-sm text-destructive"
                            >
                              {problem.reason} {problem.resolutionAction}
                            </p>
                          ))}
                        </div>
                        {passenger && canUpdate ? (
                          <PassengerEditor
                            passenger={passenger}
                            contractShifts={contractShifts(passenger.routingCompanyId)}
                            importRecord={{ batchId: imported.batch.id, recordId: record.id }}
                          />
                        ) : null}
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Lista geral</CardTitle>
            <CardDescription>
              {passengers.total} colaborador(es) no escopo. Registros pendentes nao entram
              automaticamente nas rotas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {passengers.items.length === 0 ? (
              <RoutingEmpty>
                Nenhum colaborador disponivel. Baixe o modelo e faca a primeira importacao.
              </RoutingEmpty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Identificador</TableHead>
                    <TableHead>Turno / chegada</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Roteirizacao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passengers.items.map((passenger) => (
                    <Fragment key={passenger.id}>
                      <TableRow>
                        <TableCell>
                          <p className="flex items-center gap-2 font-medium">
                            {passenger.fullName}
                            {passenger.accessibilityRequired ? (
                              <Accessibility
                                className="size-4 text-primary"
                                aria-label="Requer acessibilidade"
                              />
                            ) : null}
                          </p>
                        </TableCell>
                        <TableCell>{passenger.externalReference || '—'}</TableCell>
                        <TableCell>
                          {passenger.shift || '—'}
                          <p className="text-xs text-muted-foreground">
                            {passenger.requiredArrivalTime || 'horario pendente'}
                          </p>
                        </TableCell>
                        <TableCell>{passenger.sector || '—'}</TableCell>
                        <TableCell>
                          {passenger.registrationStatus === 'ready' ? 'Completo' : 'Pendente'}
                        </TableCell>
                        <TableCell>
                          {passenger.routingEligible ? 'Elegivel' : 'Nao elegivel'}
                        </TableCell>
                      </TableRow>
                      {canUpdate ? (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/20">
                            <PassengerEditor
                              passenger={passenger}
                              contractShifts={contractShifts(passenger.routingCompanyId)}
                            />
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </RoutingShell>
    </AuthenticatedShell>
  );
}
