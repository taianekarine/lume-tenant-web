import type { AiAgent } from '../domain';

export const AI_AGENT_CATALOG: readonly AiAgent[] = [
  {
    id: 'operations-assistant',
    name: 'Assistente de Operações',
    category: 'Operações',
    description:
      'Planejado para organizar informações operacionais e preparar resumos para apoiar a tomada de decisão.',
    capabilities: ['Resumos de ocorrências', 'Apoio ao planejamento', 'Organização de informações'],
    status: 'preparing',
  },
  {
    id: 'commercial-assistant',
    name: 'Assistente Comercial',
    category: 'Comercial',
    description:
      'Planejado para apoiar a preparação de propostas, comunicações e análises do atendimento comercial.',
    capabilities: ['Apoio a propostas', 'Revisão de comunicações', 'Organização de demandas'],
    status: 'preparing',
  },
  {
    id: 'administrative-assistant',
    name: 'Assistente Administrativo',
    category: 'Administrativo',
    description:
      'Planejado para auxiliar na revisão, síntese e organização de documentos internos.',
    capabilities: ['Síntese de documentos', 'Revisão de conteúdo', 'Padronização de informações'],
    status: 'preparing',
  },
];
