'use client';

import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

import type { QuoteProposalDashboardMetrics } from '../domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/ui/chart';

const statusChartConfig = {
  pending: { label: 'Pendentes', color: 'var(--chart-3)' },
  sent: { label: 'Enviadas', color: 'var(--chart-1)' },
  approved: { label: 'Aprovadas', color: 'var(--chart-2)' },
  cancelled: { label: 'Canceladas', color: 'var(--chart-5)' },
} satisfies ChartConfig;

const statusRoutes = {
  pending: '/quote-proposals?tab=pending',
  sent: '/quote-proposals?tab=sent',
  approved: '/quote-proposals?tab=approved',
  cancelled: '/quote-proposals?tab=cancelled',
} as const;

export interface QuoteProposalDashboardProps {
  readonly metrics: QuoteProposalDashboardMetrics;
  readonly initialError?: string | null;
}

export function QuoteProposalDashboard({
  metrics,
  initialError = null,
}: QuoteProposalDashboardProps) {
  const statusData: readonly {
    key: keyof typeof statusRoutes;
    label: string;
    value: number;
    fill: string;
  }[] = [
    {
      key: 'pending',
      label: 'Pendentes',
      value: metrics.pending,
      fill: 'var(--color-pending)',
    },
    {
      key: 'sent',
      label: 'Enviadas',
      value: metrics.sent,
      fill: 'var(--color-sent)',
    },
    {
      key: 'approved',
      label: 'Aprovadas',
      value: metrics.approved,
      fill: 'var(--color-approved)',
    },
    {
      key: 'cancelled',
      label: 'Canceladas',
      value: metrics.cancelled,
      fill: 'var(--color-cancelled)',
    },
  ];
  const cancellationData = metrics.cancellationReasons.map((item) => ({
    ...item,
    shortReason: item.reason.length > 34 ? `${item.reason.slice(0, 31)}...` : item.reason,
    fill: 'var(--color-cancelled)',
  }));

  return (
    <section aria-labelledby="quote-dashboard-title" className="space-y-5">
      <header>
        <p className="text-sm font-semibold text-primary-emphasis">Atendimento comercial</p>
        <h1 id="quote-dashboard-title" className="mt-1 text-2xl font-bold tracking-tight">
          Orçamentos
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Acompanhe a distribuição dos orçamentos e acesse cada fila pelo gráfico ou menu lateral.
        </p>
      </header>

      {initialError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-emphasis"
        >
          {initialError}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Situação dos orçamentos</CardTitle>
            <CardDescription>
              {metrics.delivered}{' '}
              {metrics.delivered === 1 ? 'orçamento entregue' : 'orçamentos entregues'} pelo
              WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={statusChartConfig}
              className="mx-auto h-[310px] w-full max-w-2xl aspect-auto"
              aria-label="Gráfico da situação dos orçamentos"
            >
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={64}
                  outerRadius={104}
                  paddingAngle={3}
                >
                  {statusData.map((item) => (
                    <Cell key={item.key} fill={item.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="key" />} />
              </PieChart>
            </ChartContainer>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {statusData.map((item) => (
                <Link
                  key={item.key}
                  href={statusRoutes[item.key]}
                  className="rounded-lg border px-3 py-2 text-center transition-colors hover:bg-muted"
                >
                  <span className="block text-xl font-bold">{item.value}</span>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Motivos de cancelamento</CardTitle>
            <CardDescription>
              Motivos registrados na decisão comercial dos orçamentos cancelados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cancellationData.length > 0 ? (
              <ChartContainer
                config={statusChartConfig}
                className="h-[350px] w-full aspect-auto"
                aria-label="Gráfico dos motivos de cancelamento"
              >
                <BarChart
                  accessibilityLayer
                  data={cancellationData}
                  layout="vertical"
                  margin={{ left: 8, right: 20 }}
                >
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    type="category"
                    dataKey="shortReason"
                    width={150}
                    tickLine={false}
                    axisLine={false}
                  />
                  <XAxis type="number" allowDecimals={false} hide />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel nameKey="reason" />}
                  />
                  <Bar dataKey="count" fill="var(--color-cancelled)" radius={6} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[350px] items-center justify-center rounded-xl border border-dashed px-6 text-center text-sm text-muted-foreground">
                Nenhum orçamento cancelado no período consultado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
