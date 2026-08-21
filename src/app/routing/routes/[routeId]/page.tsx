import { Download, ExternalLink, MapPin, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { hasPermission } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';
import { routeLifecycleAction } from '@/features/routing/actions';
import { RoutingError } from '@/features/routing/application';
import { RoutingShell } from '@/features/routing/components';
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

function LifecycleButton({
  routeId,
  version,
  operation,
  label,
}: {
  readonly routeId: string;
  readonly version: number;
  readonly operation: string;
  readonly label: string;
}) {
  return (
    <form action={routeLifecycleAction}>
      <input type="hidden" name="routeId" value={routeId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <input type="hidden" name="operation" value={operation} />
      <Button type="submit">{label}</Button>
    </form>
  );
}

export default async function RoutingRouteDetailPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ routeId: string }>;
  readonly searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireTenantSession(['routes:view']);
  const [{ routeId }, query] = await Promise.all([params, searchParams]);
  let detail;
  try {
    detail = await executeAuthenticatedRoutingRequest((gateway) => gateway.getRoute(routeId));
  } catch (error) {
    if (error instanceof RoutingError && error.code === 'not-found') notFound();
    throw error;
  }
  const { route, points, assignments } = detail;
  const canUpdate = hasPermission(session.user, 'routes:update');
  const canApprove = hasPermission(session.user, 'routes:approve');
  const canPublish = hasPermission(session.user, 'routes:publish');
  const canExport = hasPermission(session.user, 'routes:export');
  const exportReady = route.status === 'approved' || route.status === 'published';

  return (
    <AuthenticatedShell user={session.user}>
      <RoutingShell
        title={route.name}
        description={`${route.code} · ${route.shift} · chegada obrigatória ${route.requiredArrivalTime}`}
      >
        <PageFeedbackToast error={query.error} success={query.success} />
        <div className="grid gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Situação</CardDescription>
              <CardTitle className="text-lg">{statusLabel[route.status]}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Veículo / capacidade</CardDescription>
              <CardTitle className="text-lg">
                {route.predictedVehicleName} · {route.predictedVehicleCapacity}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>KM planejado</CardDescription>
              <CardTitle className="text-lg">{route.plannedTotalKm ?? '—'} km</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Ida {route.plannedOutboundKm ?? '—'} · volta {route.plannedReturnKm ?? '—'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Colaboradores / excedentes</CardDescription>
              <CardTitle className="text-lg">
                {assignments.length} / {route.overflowPassengerCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpdate && route.status === 'routed' ? (
            <LifecycleButton
              routeId={route.id}
              version={route.version}
              operation="in-review"
              label="Iniciar revisão"
            />
          ) : null}
          {canUpdate && route.status === 'in-review' ? (
            <LifecycleButton
              routeId={route.id}
              version={route.version}
              operation="pending-approval"
              label="Enviar para aprovação"
            />
          ) : null}
          {canApprove && route.status === 'pending-approval' ? (
            <LifecycleButton
              routeId={route.id}
              version={route.version}
              operation="approve"
              label="Aprovar versão"
            />
          ) : null}
          {canPublish && route.status === 'approved' ? (
            <LifecycleButton
              routeId={route.id}
              version={route.version}
              operation="publish"
              label="Publicar na aplicação"
            />
          ) : null}
          {canExport && exportReady ? (
            <>
              <Button
                render={<Link href={`/routing/routes/${route.id}/downloads/pdf`} />}
                nativeButton={false}
                variant="outline"
              >
                <Download className="size-4" />
                PDF operacional
              </Button>
              <Button
                render={<Link href={`/routing/routes/${route.id}/downloads/xlsx`} />}
                nativeButton={false}
                variant="outline"
              >
                <Download className="size-4" />
                XLSX operacional
              </Button>
              <Button
                render={<Link href={`/routing/routes/${route.id}/downloads/my-maps.xlsx`} />}
                nativeButton={false}
                variant="outline"
              >
                <Download className="size-4" />
                My Maps XLSX
              </Button>
              <Button
                render={<Link href={`/routing/routes/${route.id}/downloads/my-maps.csv`} />}
                nativeButton={false}
                variant="outline"
              >
                <Download className="size-4" />
                My Maps CSV
              </Button>
            </>
          ) : null}
        </div>
        {exportReady ? (
          <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            As exportações usam a versão aprovada e imutável. O XLSX/CSV do My Maps não contém
            centro de custo; o XLSX operacional contém.
          </p>
        ) : null}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,.7fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-5" />
                Pontos da rota
              </CardTitle>
              <CardDescription>
                Ordem sugerida, endereço e horário. Alertas devem ser resolvidos na revisão
                operacional.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Direção</TableHead>
                    <TableHead>Ponto</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Horário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {points.map((point) => (
                    <TableRow key={point.id}>
                      <TableCell>{point.sequence}</TableCell>
                      <TableCell>{point.direction === 'outbound' ? 'Ida' : 'Retorno'}</TableCell>
                      <TableCell>
                        {point.address.label}
                        {point.alerts.length ? (
                          <p className="text-xs text-amber-600">{point.alerts.join('; ')}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {point.address.street}, {point.address.number} — {point.address.district},{' '}
                        {point.address.city}/{point.address.state}
                      </TableCell>
                      <TableCell>{point.scheduledTime || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersRound className="size-5" />
                  Vínculos
                </CardTitle>
                <CardDescription>
                  {assignments.length} colaborador(es), incluindo pendências e excedentes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">
                      {assignment.passengerName || assignment.passengerId}
                    </p>
                    <p className="text-muted-foreground">
                      {assignment.status} · caminhada {assignment.walkingDistanceMeters ?? '—'} m
                    </p>
                    {assignment.warnings.length ? (
                      <p className="mt-1 text-xs text-amber-600">
                        {assignment.warnings.join('; ')}
                      </p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
            {detail.navigationLinks?.length ? (
              <Card>
                <CardHeader>
                  <CardTitle>Google Maps</CardTitle>
                  <CardDescription>
                    Links divididos quando a quantidade de pontos excede o limite por navegação.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {detail.navigationLinks.map((link) => (
                    <Button
                      key={`${link.direction}-${link.sequence}`}
                      render={<a href={link.url} target="_blank" rel="noreferrer" />}
                      nativeButton={false}
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {link.label}
                      <ExternalLink className="size-4" />
                    </Button>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </RoutingShell>
    </AuthenticatedShell>
  );
}
