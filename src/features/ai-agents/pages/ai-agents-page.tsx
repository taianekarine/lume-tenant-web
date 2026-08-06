import { Sparkles } from 'lucide-react';

import type { AuthenticatedSession } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';

import { AgentCatalog } from '../components';
import { AI_AGENT_CATALOG } from '../data';
import { aiAgentsPageStyles as styles } from './ai-agents-page.styles';

export interface AiAgentsPageProps {
  readonly session: AuthenticatedSession;
}

export function AiAgentsPage({ session }: AiAgentsPageProps) {
  return (
    <AuthenticatedShell user={session.user}>
      <div className={styles.content()}>
        <p className={styles.eyebrow()}>Ferramentas internas</p>
        <h1 className={styles.title()}>Agentes de IA</h1>
        <p className={styles.description()}>
          Consulte os assistentes planejados para apoiar as equipes da Lume. Use a busca para
          localizar agentes por nome, área ou capacidade.
        </p>

        <aside className={styles.notice()}>
          <Sparkles aria-hidden="true" className={styles.noticeIcon()} />
          <div>
            <p className={styles.noticeTitle()}>Integração em preparação</p>
            <p className={styles.noticeDescription()}>
              O catálogo já pode ser consultado. A abertura de conversas será disponibilizada
              somente após a integração segura com o serviço de IA.
            </p>
          </div>
        </aside>

        <AgentCatalog agents={AI_AGENT_CATALOG} />
      </div>
    </AuthenticatedShell>
  );
}
