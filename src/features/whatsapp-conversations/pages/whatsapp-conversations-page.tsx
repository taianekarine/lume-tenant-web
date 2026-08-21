import type { AuthenticatedSession } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';

import { ConversationWorkspace } from '../components';
import type { WhatsAppConversation, WhatsAppConversationMetrics } from '../domain';
import { whatsAppConversationsPageStyles as styles } from './whatsapp-conversations-page.styles';

export interface WhatsAppConversationsPageProps {
  readonly session: AuthenticatedSession;
  readonly conversations: readonly WhatsAppConversation[];
  readonly pagination?: {
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly totalPages: number;
  };
  readonly metrics?: WhatsAppConversationMetrics;
  readonly initialError?: string | null;
}

export function WhatsAppConversationsPage({
  session,
  conversations,
  pagination,
  metrics,
  initialError = null,
}: WhatsAppConversationsPageProps) {
  return (
    <AuthenticatedShell user={session.user}>
      <div className={styles.content()}>
        <ConversationWorkspace
          initialConversations={conversations}
          initialPagination={pagination}
          initialMetrics={metrics}
          initialError={initialError}
          currentUserId={session.user.id}
        />
      </div>
    </AuthenticatedShell>
  );
}
