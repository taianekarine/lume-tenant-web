'use client';

import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis } from 'recharts';
import { BarChart3, Building2, CircleAlert } from 'lucide-react';

import type { AuthenticatedSession } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';
import { QuoteProposalDashboard } from '@/features/quote-proposals/components';
import type { QuoteProposalDashboardMetrics } from '@/features/quote-proposals/domain';
import { ConversationMetricsCards } from '@/features/whatsapp-conversations/components/conversation-metrics-cards';
import { DEPARTMENT_LABELS } from '@/features/whatsapp-conversations/components/conversation-labels';
import {
  getWhatsAppConversationMetrics,
  isWhatsAppConversationDepartment,
  type WhatsAppConversation,
  type WhatsAppConversationDepartment,
} from '@/features/whatsapp-conversations/domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/ui/chart';

import { dashboardPageStyles as styles } from './dashboard-page.styles';

export interface DashboardPageProps {
  readonly session: AuthenticatedSession;
  readonly conversations?: readonly WhatsAppConversation[];
  readonly initialError?: string | null;
  readonly quoteMetrics?: QuoteProposalDashboardMetrics | null;
  readonly quoteInitialError?: string | null;
}

const operationalChartConfig = {
  botActive: { label: 'Bot ativo', color: 'var(--chart-1)' },
  attendantActive: { label: 'Atendente ativo', color: 'var(--chart-2)' },
  automationPaused: { label: 'Automação pausada', color: 'var(--chart-3)' },
  unreadConversations: { label: 'Conversas não lidas', color: 'var(--chart-4)' },
  closed: { label: 'Encerrada', color: 'var(--chart-5)' },
} satisfies ChartConfig;

const departmentColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'hsl(var(--primary))',
] as const;

function getDepartmentVolume(conversations: readonly WhatsAppConversation[]) {
  const totals = new Map<WhatsAppConversationDepartment, number>();

  for (const conversation of conversations) {
    totals.set(conversation.department, (totals.get(conversation.department) ?? 0) + 1);
  }

  return [...totals.entries()]
    .sort((first, second) => second[1] - first[1])
    .slice(0, 6)
    .map(([department, value], index) => ({
      department,
      label: DEPARTMENT_LABELS[department],
      value,
      fill: departmentColors[index] ?? 'var(--chart-1)',
    }));
}

export function DashboardPage({
  session,
  conversations = [],
  initialError = null,
  quoteMetrics = null,
  quoteInitialError = null,
}: DashboardPageProps) {
  const assignedDepartments = session.user.departments.filter(
    (department): department is WhatsAppConversationDepartment =>
      isWhatsAppConversationDepartment(department),
  );
  const scopedConversations =
    assignedDepartments.length === 0
      ? conversations
      : conversations.filter((conversation) =>
          assignedDepartments.includes(conversation.department),
        );
  const metrics = getWhatsAppConversationMetrics(scopedConversations);
  const departmentLabels = assignedDepartments.map((department) =>
    isWhatsAppConversationDepartment(department) ? DEPARTMENT_LABELS[department] : department,
  );
  const isCommercialScope = assignedDepartments.includes('commercial');
  const operationalData = [
    { key: 'botActive', label: 'Bot ativo', value: metrics.botActive },
    { key: 'attendantActive', label: 'Atendente ativo', value: metrics.attendantActive },
    { key: 'automationPaused', label: 'Automação pausada', value: metrics.automationPaused },
    {
      key: 'unreadConversations',
      label: 'Conversas não lidas',
      value: metrics.unreadConversations,
    },
  ].map((item) => ({
    ...item,
    fill: `var(--color-${item.key})`,
  }));
  const departmentData = getDepartmentVolume(scopedConversations);
  const departmentChartConfig = Object.fromEntries(
    departmentData.map((item) => [item.department, { label: item.label, color: item.fill }]),
  ) satisfies ChartConfig;
  const controlDistributionData = [
    {
      key: 'botActive',
      label: 'Bot ativo',
      value: metrics.botActive,
      fill: 'var(--color-botActive)',
    },
    {
      key: 'attendantActive',
      label: 'Atendente ativo',
      value: metrics.attendantActive,
      fill: 'var(--color-attendantActive)',
    },
    {
      key: 'automationPaused',
      label: 'Automação pausada',
      value: metrics.automationPaused,
      fill: 'var(--color-automationPaused)',
    },
    {
      key: 'closed',
      label: 'Encerrada',
      value: scopedConversations.filter(
        (conversation) => conversation.conversationState === 'closed',
      ).length,
      fill: 'var(--color-closed)',
    },
  ].filter((item) => item.value > 0);
  const showDepartmentVolume = assignedDepartments.length !== 1;
  const unreadConversationSummary = `${metrics.unreadConversations} ${
    metrics.unreadConversations === 1 ? 'conversa não lida' : 'conversas não lidas'
  }`;

  return (
    <AuthenticatedShell user={session.user}>
      <main className={styles.content()}>
        <p className={styles.eyebrow()}>Olá, {session.user.name}</p>
        <div className={styles.heading()}>
          <div>
            <h1 className={styles.title()}>
              {assignedDepartments.length === 1
                ? `Dashboard ${departmentLabels[0]}`
                : 'Visão geral do atendimento'}
            </h1>
            <p className={styles.description()}>
              Indicadores limitados às filas atribuídas ao seu perfil para destacar onde sua equipe
              precisa atuar.
            </p>
          </div>
          <span className={styles.liveBadge()}>
            <BarChart3 aria-hidden="true" />
            Dados da Tenant API
          </span>
        </div>

        {initialError ? (
          <div role="alert" className={styles.errorBanner()}>
            <CircleAlert aria-hidden="true" />
            <span>{initialError}</span>
          </div>
        ) : null}

        <ConversationMetricsCards conversations={scopedConversations} className="mt-5" />

        <div className={styles.graphGrid()}>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Condução das conversas</CardTitle>
              <CardDescription>
                Distribuição calculada pelo estado canônico de cada atendimento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={operationalChartConfig}
                className="h-[280px] w-full aspect-auto"
                aria-label="Gráfico de barras da condução das conversas"
              >
                <BarChart accessibilityLayer data={operationalData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    interval={0}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel nameKey="key" />}
                  />
                  <Bar dataKey="value" radius={8} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                {showDepartmentVolume
                  ? 'Volume por departamento'
                  : `Situação da fila ${departmentLabels[0]}`}
              </CardTitle>
              <CardDescription>
                {showDepartmentVolume
                  ? 'Participação das filas no volume atual de conversas.'
                  : 'Distribuição dos atendimentos pelo estado canônico atual.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(showDepartmentVolume ? departmentData : controlDistributionData).length > 0 ? (
                <ChartContainer
                  config={showDepartmentVolume ? departmentChartConfig : operationalChartConfig}
                  className="mx-auto h-[280px] w-full max-w-xl aspect-auto"
                  aria-label="Gráfico de setores do volume por departamento"
                >
                  <PieChart accessibilityLayer>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          hideLabel
                          nameKey={showDepartmentVolume ? 'department' : 'key'}
                        />
                      }
                    />
                    <Pie
                      data={showDepartmentVolume ? departmentData : controlDistributionData}
                      dataKey="value"
                      nameKey={showDepartmentVolume ? 'department' : 'key'}
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={3}
                    />
                    <ChartLegend
                      content={
                        <ChartLegendContent nameKey={showDepartmentVolume ? 'department' : 'key'} />
                      }
                      verticalAlign="bottom"
                    />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  Nenhuma conversa encontrada para este período.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className={styles.summaryCard()}>
          <CardContent className={styles.summaryContent()}>
            <span className={styles.summaryIcon()}>
              <Building2 aria-hidden="true" />
            </span>
            <div>
              <strong>
                {metrics.total}{' '}
                {metrics.total === 1 ? 'conversa monitorada' : 'conversas monitoradas'}
              </strong>
              <p>
                {isCommercialScope
                  ? `${metrics.awaitingProposal} aguardando proposta e ${unreadConversationSummary}.`
                  : `${metrics.attendantActive} com atendente, ${metrics.automationPaused} com automação pausada e ${unreadConversationSummary}.`}
              </p>
            </div>
          </CardContent>
        </Card>

        {isCommercialScope && quoteMetrics ? (
          <div className="mt-6 border-t pt-6">
            <QuoteProposalDashboard metrics={quoteMetrics} initialError={quoteInitialError} />
          </div>
        ) : null}
      </main>
    </AuthenticatedShell>
  );
}
