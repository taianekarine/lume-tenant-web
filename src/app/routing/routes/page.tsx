import Link from 'next/link';

import { AuthenticatedShell } from '@/features/navigation';
import { RoutingEmpty, RoutingShell } from '@/features/routing/components';
import { executeAuthenticatedRoutingRequest } from '@/features/routing/server';
import { requireTenantSession } from '@/features/tenant-administration/server';
import { PageFeedbackToast } from '@/shared/page-feedback-toast';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

const statusLabel = {
  draft: 'Rascunho',
  routed: 'Roteirizada',
  'in-review': 'Em revisão',
  'pending-approval': 'Aguardando aprovação',
  approved: 'Aprovada',
  published: 'Publicada',
} as const;

export default async function RoutingRoutesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireTenantSession(['routes:view']);
  const query = await searchParams;
  const routes = await executeAuthenticatedRoutingRequest((gateway) => gateway.listRoutes());
  return (
    <AuthenticatedShell user={session.user}>
      <RoutingShell
        title="Rotas sugeridas"
        description="Esta tela não cria rotas manualmente. As sugestões aparecem após a execução de um contrato vigente e seguem para revisão, aprovação e publicação."
      >
        <PageFeedbackToast error={query.error} success={query.success} />
        <Card>
          <CardHeader>
            <CardTitle>Operação</CardTitle>
            <CardDescription>
              {routes.total} rota(s) gerada(s) a partir de contratos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {routes.items.length === 0 ? (
              <RoutingEmpty>
                Nenhuma sugestão gerada. Abra Contratos e execute a roteirização para uma data de
                serviço.
              </RoutingEmpty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rota</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>KM ida / volta / total</TableHead>
                    <TableHead>Capacidade</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.items.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell>
                        <p className="font-medium">{route.name}</p>
                        <p className="text-xs text-muted-foreground">{route.code}</p>
                      </TableCell>
                      <TableCell>
                        {route.shift}
                        <p className="text-xs text-muted-foreground">
                          chegada {route.requiredArrivalTime}
                        </p>
                      </TableCell>
                      <TableCell>{route.predictedVehicleName}</TableCell>
                      <TableCell>
                        {route.plannedOutboundKm ?? '—'} / {route.plannedReturnKm ?? '—'} /{' '}
                        {route.plannedTotalKm ?? '—'}
                      </TableCell>
                      <TableCell>
                        {route.predictedVehicleCapacity}
                        {route.overflowPassengerCount > 0 ? (
                          <p className="text-xs text-destructive">
                            {route.overflowPassengerCount} excedente(s)
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {statusLabel[route.status]}
                        {route.needsRerouting ? (
                          <p className="text-xs text-amber-600">recalcular</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          render={<Link href={`/routing/routes/${route.id}`} />}
                          nativeButton={false}
                          size="sm"
                          variant="outline"
                        >
                          Revisar
                        </Button>
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
