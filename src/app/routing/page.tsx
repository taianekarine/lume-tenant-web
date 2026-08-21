import { ArrowRight, Building2, FileSpreadsheet, Route, UsersRound } from 'lucide-react';
import Link from 'next/link';

import { AuthenticatedShell } from '@/features/navigation';
import { RoutingShell } from '@/features/routing/components';
import { requireTenantSession } from '@/features/tenant-administration/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

const stages = [
  {
    icon: Building2,
    title: '1. Cliente',
    description: 'Cadastre o cliente PF ou PJ da Milenium, sem criar um novo tenant.',
    href: '/routing/companies',
  },
  {
    icon: FileSpreadsheet,
    title: '2. Contrato operacional',
    description: 'Defina unidade, centros de custo, vigência, turnos, veículos, capacidade e KM.',
    href: '/routing/contracts',
  },
  {
    icon: UsersRound,
    title: '3. Lista geral de colaboradores',
    description: 'Escolha o cliente, baixe o modelo oficial XLSX e importe a lista vinculada.',
    href: '/routing/passengers',
  },
  {
    icon: Route,
    title: '4. Sugestão, revisão e aprovação',
    description:
      'A IA aplica as regras do contrato; o operacional revisa, aprova, publica e exporta.',
    href: '/routing/routes',
  },
] as const;

export default async function RoutingPage() {
  const session = await requireTenantSession([
    'routes:view',
    'routes:use',
    'routing-contracts:view',
    'routing-companies:view',
    'passengers:view',
    'passengers:import',
  ]);
  return (
    <AuthenticatedShell user={session.user}>
      <RoutingShell
        title="Roteirização"
        description="A rota não nasce de um cadastro manual: ela é uma sugestão operacional produzida a partir do contrato vigente e dos colaboradores elegíveis."
      >
        <div className="grid gap-4 lg:grid-cols-4">
          {stages.map(({ icon: Icon, ...stage }) => (
            <Link key={stage.href} href={stage.href} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardHeader>
                  <Icon className="size-6 text-primary" />
                  <CardTitle className="text-base">{stage.title}</CardTitle>
                  <CardDescription>{stage.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2 text-sm font-medium text-primary">
                  Abrir etapa <ArrowRight className="size-4" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Exportações do MVP</CardTitle>
            <CardDescription>
              PDF e XLSX para a operação; XLSX e CSV para Google My Maps. O centro de custo
              permanece no contrato e no relatório operacional, mas não integra os arquivos do My
              Maps.
            </CardDescription>
          </CardHeader>
        </Card>
      </RoutingShell>
    </AuthenticatedShell>
  );
}
