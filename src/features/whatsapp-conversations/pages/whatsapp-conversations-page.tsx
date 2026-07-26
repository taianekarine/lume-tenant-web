import { Bot, Headset, MessageCircle, PauseCircle } from 'lucide-react';

import type { AuthenticatedSession } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

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
  const unreadMessages = conversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0,
  );
  const botConversations = conversations.filter(
    (conversation) => conversation.conversationState === 'bot-active',
  ).length;
  const humanConversations = conversations.filter(
    (conversation) => conversation.conversationState === 'human-active',
  ).length;
  const pausedConversations = conversations.filter(
    (conversation) =>
      conversation.conversationState !== 'bot-active' &&
      conversation.conversationState !== 'human-active' &&
      conversation.conversationState !== 'closed',
  ).length;

  return (
    <AuthenticatedShell user={session.user}>
      <main className={styles.content()}>
        <p className={styles.eyebrow()}>Atendimento comercial</p>
        <h1 className={styles.title()}>Conversas do WhatsApp</h1>
        <p className={styles.description()}>
          Acompanhe quem conduz cada conversa, a etapa do fluxo e o andamento das solicitações em um
          único espaço.
        </p>

        <div className={styles.metrics()}>
          <Card className={styles.metricCard()}>
            <CardHeader className={styles.metricHeader()}>
              <span className={styles.metricIcon()}>
                <Bot aria-hidden="true" />
              </span>
              <CardTitle className={styles.metricTitle()}>Bot ativo</CardTitle>
            </CardHeader>
            <CardContent className={styles.metricContent()}>
              <strong className={styles.metricValue()}>{botConversations}</strong>
            </CardContent>
          </Card>

          <Card className={styles.metricCard()}>
            <CardHeader className={styles.metricHeader()}>
              <span className={styles.metricIcon({ tone: 'amber' })}>
                <Headset aria-hidden="true" />
              </span>
              <CardTitle className={styles.metricTitle()}>Humano ativo</CardTitle>
            </CardHeader>
            <CardContent className={styles.metricContent()}>
              <strong className={styles.metricValue()}>{humanConversations}</strong>
            </CardContent>
          </Card>

          <Card className={styles.metricCard()}>
            <CardHeader className={styles.metricHeader()}>
              <span className={styles.metricIcon({ tone: 'green' })}>
                <PauseCircle aria-hidden="true" />
              </span>
              <CardTitle className={styles.metricTitle()}>Automação pausada</CardTitle>
            </CardHeader>
            <CardContent className={styles.metricContent()}>
              <strong className={styles.metricValue()}>{pausedConversations}</strong>
            </CardContent>
          </Card>

          <Card className={styles.metricCard()}>
            <CardHeader className={styles.metricHeader()}>
              <span className={styles.metricIcon({ tone: 'violet' })}>
                <MessageCircle aria-hidden="true" />
              </span>
              <CardTitle className={styles.metricTitle()}>Mensagens não lidas</CardTitle>
            </CardHeader>
            <CardContent className={styles.metricContent()}>
              <strong className={styles.metricValue()}>{unreadMessages}</strong>
            </CardContent>
          </Card>
        </div>

        <ConversationWorkspace
          initialConversations={conversations}
          initialError={initialError}
          currentUserId={session.user.id}
        />
      </main>
    </AuthenticatedShell>
  );
}
