import { Accessibility, Download, Upload } from 'lucide-react';
import Link from 'next/link';

import { hasPermission } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';
import { importRoutingPassengersAction } from '@/features/routing/actions';
import { RoutingEmpty, RoutingShell } from '@/features/routing/components';
import { executeAuthenticatedRoutingRequest } from '@/features/routing/server';
import { requireTenantSession } from '@/features/tenant-administration/server';
import { PageFeedbackToast } from '@/shared/page-feedback-toast';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

export default async function RoutingPassengersPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireTenantSession(['passengers:view', 'passengers:import']);
  const query = await searchParams;
  const canView = hasPermission(session.user, 'passengers:view');
  const canImport = hasPermission(session.user, 'passengers:import');
  const passengers = canView
    ? await executeAuthenticatedRoutingRequest((gateway) => gateway.listPassengers())
    : { items: [], total: 0 };

  return (
    <AuthenticatedShell user={session.user}>
      <RoutingShell
        title="Colaboradores transportados"
        description="A lista é geral por empresa atendida. A elegibilidade será calculada pela IA conforme contrato, turno, horário, capacidade, distância e pendências documentais."
      >
        <PageFeedbackToast error={query.error} success={query.success} />
        {canImport ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>1. Baixar modelo oficial</CardTitle>
                <CardDescription>
                  Use o XLSX oficial. Cada linha possui o CNPJ da empresa atendida; funcionários
                  internos autorizados podem importar várias empresas, enquanto o cliente PJ
                  permanece limitado à sua empresa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  render={<Link href="/routing/passengers/template" />}
                  nativeButton={false}
                  variant="outline"
                >
                  <Download className="size-4" />
                  Baixar modelo XLSX
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>2. Importar planilha preenchida</CardTitle>
                <CardDescription>
                  A importação é incremental: cria, atualiza, mantém ou sinaliza conflito por linha,
                  sem apagar o cadastro geral.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  action={importRoutingPassengersAction}
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="passenger-file">Arquivo XLSX</Label>
                    <Input
                      id="passenger-file"
                      name="file"
                      type="file"
                      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      required
                    />
                  </div>
                  <Button type="submit">
                    <Upload className="size-4" />
                    Importar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Lista geral</CardTitle>
            <CardDescription>
              {passengers.total} colaborador(es) no escopo. Registros pendentes não entram
              automaticamente nas rotas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {passengers.items.length === 0 ? (
              <RoutingEmpty>
                Nenhum colaborador disponível. Baixe o modelo e faça a primeira importação.
              </RoutingEmpty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Turno / chegada</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Roteirização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passengers.items.map((passenger) => (
                    <TableRow key={passenger.id}>
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
                          {passenger.requiredArrivalTime || 'horário pendente'}
                        </p>
                      </TableCell>
                      <TableCell>{passenger.sector || '—'}</TableCell>
                      <TableCell>
                        {passenger.registrationStatus === 'ready' ? 'Completo' : 'Pendente'}
                      </TableCell>
                      <TableCell>
                        {passenger.routingEligible ? 'Elegível' : 'Não elegível'}
                      </TableCell>
                    </TableRow>
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
