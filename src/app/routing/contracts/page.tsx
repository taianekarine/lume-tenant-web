import { CalendarDays, Sparkles } from 'lucide-react';

import { hasPermission } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';
import {
  createRoutingContractAction,
  generateContractRoutesAction,
} from '@/features/routing/actions';
import { RoutingEmpty, RoutingShell } from '@/features/routing/components';
import { executeAuthenticatedRoutingRequest } from '@/features/routing/server';
import { requireTenantSession } from '@/features/tenant-administration/server';
import { PageFeedbackToast } from '@/shared/page-feedback-toast';
import { PostalCodeAddressFields } from '@/shared/address';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Textarea } from '@/shared/ui/textarea';

const statusLabel = {
  draft: 'Rascunho',
  active: 'Ativo',
  suspended: 'Suspenso',
  ended: 'Encerrado',
} as const;
const periodicityLabel = {
  monthly: 'Mensal',
  weekly: 'Semanal',
  daily: 'Diário',
  'per-route': 'Por rota',
} as const;
const weekdays = [
  ['1', 'Seg'],
  ['2', 'Ter'],
  ['3', 'Qua'],
  ['4', 'Qui'],
  ['5', 'Sex'],
  ['6', 'Sáb'],
  ['0', 'Dom'],
] as const;

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
  const [contracts, companies] = await Promise.all([
    canView
      ? executeAuthenticatedRoutingRequest((gateway) => gateway.listContracts())
      : Promise.resolve({ items: [], total: 0 }),
    canCreate || canView
      ? executeAuthenticatedRoutingRequest((gateway) => gateway.listCompanies({ status: 'active' }))
      : Promise.resolve({ items: [], total: 0 }),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AuthenticatedShell user={session.user}>
      <RoutingShell
        title="Contratos operacionais"
        description="O contrato é a entidade principal: concentra o acordo comercial que limita a seleção de colaboradores e a sugestão das rotas."
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
              <RoutingEmpty>Nenhum contrato disponível.</RoutingEmpty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Unidade / turno</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead>Veículos / capacidade</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.items.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <p className="font-medium">{contract.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {contract.code} · {periodicityLabel[contract.periodicity]}
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
                          até {contract.validUntil || 'sem término'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {contract.contractedVehicleCount} / {contract.predictedVehicleCapacity}{' '}
                        lugares
                      </TableCell>
                      <TableCell>{statusLabel[contract.status]}</TableCell>
                      <TableCell className="text-right">
                        {canGenerate && contract.status === 'active' ? (
                          <form
                            action={generateContractRoutesAction}
                            className="inline-flex items-center gap-2"
                          >
                            <input type="hidden" name="contractId" value={contract.id} />
                            <Input
                              className="h-8 w-36"
                              type="date"
                              name="serviceDate"
                              defaultValue={today}
                              aria-label={`Data para gerar ${contract.name}`}
                            />
                            <Button size="sm" type="submit">
                              <Sparkles className="size-4" />
                              Gerar sugestões
                            </Button>
                          </form>
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
                O formulário cria a primeira configuração operacional. Centros de custo continuam
                internos ao contrato e não serão enviados ao Google My Maps.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createRoutingContractAction} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor="contract-company">Empresa atendida</Label>
                    <select
                      id="contract-company"
                      name="routingCompanyId"
                      required
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">Selecione</option>
                      {companies.items.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.tradeName || company.legalName} — {company.taxId}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract-code">Código</Label>
                    <Input id="contract-code" name="code" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract-name">Nome</Label>
                    <Input id="contract-name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="operation-type">Tipo de operação</Label>
                    <Input
                      id="operation-type"
                      name="operationType"
                      placeholder="Fretamento contínuo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="route-type">Abrangência</Label>
                    <select
                      id="route-type"
                      name="routeType"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="municipal">Municipal</option>
                      <option value="intermunicipal">Intermunicipal</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="periodicity">Periodicidade do KM</Label>
                    <select
                      id="periodicity"
                      name="periodicity"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="monthly">Mensal</option>
                      <option value="weekly">Semanal</option>
                      <option value="daily">Diária</option>
                      <option value="per-route">Por rota</option>
                    </select>
                  </div>
                  <input type="hidden" name="status" value="active" />
                  <div className="space-y-2">
                    <Label htmlFor="unit-name">Unidade atendida</Label>
                    <Input id="unit-name" name="unitName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valid-from">Início da vigência</Label>
                    <Input id="valid-from" name="validFrom" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valid-until">Fim da vigência</Label>
                    <Input id="valid-until" name="validUntil" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-count">Veículos contratados</Label>
                    <Input
                      id="vehicle-count"
                      name="contractedVehicleCount"
                      type="number"
                      min={1}
                      defaultValue={1}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-name">Veículo previsto</Label>
                    <Input
                      id="vehicle-name"
                      name="predictedVehicleName"
                      placeholder="Micro-ônibus"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-reference">Referência / prefixo</Label>
                    <Input id="vehicle-reference" name="predictedVehicleReference" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-capacity">Capacidade prevista</Label>
                    <Input
                      id="vehicle-capacity"
                      name="predictedVehicleCapacity"
                      type="number"
                      min={1}
                      defaultValue={28}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contracted-km">KM contratado</Label>
                    <Input
                      id="contracted-km"
                      name="contractedKm"
                      type="number"
                      min={0}
                      step="0.001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planned-km">KM previsto</Label>
                    <Input id="planned-km" name="plannedKm" type="number" min={0} step="0.001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-walk">Caminhada máxima (m)</Label>
                    <Input
                      id="max-walk"
                      name="maxWalkingDistanceMeters"
                      type="number"
                      min={0}
                      defaultValue={500}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost-code">Centro de custo</Label>
                    <Input id="cost-code" name="costCenterCode" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost-name">Descrição do centro</Label>
                    <Input id="cost-name" name="costCenterName" />
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor="documents">Dados documentais exigidos</Label>
                    <Input
                      id="documents"
                      name="requiredDocumentTypeCodes"
                      placeholder="cpf, matricula (opcional, separados por vírgula)"
                    />
                  </div>
                </div>
                <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <legend className="px-2 text-sm font-semibold">Turno e horário</legend>
                  <div className="space-y-2">
                    <Label htmlFor="shift-name">Turno</Label>
                    <Input id="shift-name" name="shiftName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arrival-time">Chegada obrigatória</Label>
                    <Input id="arrival-time" name="requiredArrivalTime" type="time" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shift-vehicles">Veículos neste turno</Label>
                    <Input id="shift-vehicles" name="shiftVehicleCount" type="number" min={1} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shift-capacity">Capacidade neste turno</Label>
                    <Input id="shift-capacity" name="shiftVehicleCapacity" type="number" min={1} />
                  </div>
                  <div className="flex flex-wrap gap-4 sm:col-span-2 lg:col-span-4">
                    {weekdays.map(([day, label]) => (
                      <label key={day} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="activeWeekdays"
                          value={day}
                          defaultChecked={day !== '0' && day !== '6'}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <PostalCodeAddressFields prefix="origin" title="Ponto de saída" />
                <PostalCodeAddressFields prefix="destination" title="Destino / unidade" />
                <div className="space-y-2">
                  <Label htmlFor="contract-notes">Observações</Label>
                  <Textarea id="contract-notes" name="notes" />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Cadastrar contrato</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </RoutingShell>
    </AuthenticatedShell>
  );
}
