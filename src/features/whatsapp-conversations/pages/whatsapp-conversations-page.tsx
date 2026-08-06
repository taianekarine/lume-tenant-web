import type { AuthenticatedSession } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';

import { ConversationWorkspace } from '../components';
import type { WhatsAppConversation } from '../domain';
import { whatsAppConversationsPageStyles as styles } from './whatsapp-conversations-page.styles';

export interface WhatsAppConversationsPageProps {
  readonly session: AuthenticatedSession;
  readonly conversations: readonly WhatsAppConversation[];
  readonly initialError?: string | null;
}

export function WhatsAppConversationsPage({
  session,
  conversations,
  initialError = null,
}: WhatsAppConversationsPageProps) {
  return (
    <AuthenticatedShell user={session.user}>
      <div className={styles.content()}>
        <ConversationWorkspace
          initialConversations={conversations}
          initialError={initialError}
          currentUserId={session.user.id}
        />
      </div>
    </AuthenticatedShell>
  );
}
