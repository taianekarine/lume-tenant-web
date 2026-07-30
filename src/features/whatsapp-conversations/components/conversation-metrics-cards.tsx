import { Bot, Headset, MessageCircle, PauseCircle } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

import { getWhatsAppConversationMetrics, type WhatsAppConversation } from '../domain';

export interface ConversationMetricsCardsProps {
  readonly conversations: readonly WhatsAppConversation[];
  readonly className?: string;
}

export function ConversationMetricsCards({
  conversations,
  className,
}: ConversationMetricsCardsProps) {
  const metrics = getWhatsAppConversationMetrics(conversations);
  const items = [
    {
      label: 'Bot ativo',
      value: metrics.botActive,
      icon: Bot,
      tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    },
    {
      label: 'Atendente ativo',
      value: metrics.attendantActive,
      icon: Headset,
      tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    },
    {
      label: 'Automação pausada',
      value: metrics.automationPaused,
      icon: PauseCircle,
      tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
    {
      label: 'Conversas não lidas',
      value: metrics.unreadConversations,
      icon: MessageCircle,
      tone: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    },
  ] as const;

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Card key={item.label} size="sm" className="gap-0 py-0 shadow-sm">
            <CardHeader className="flex grid-cols-none flex-row items-center gap-2.5 px-4 pt-3">
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-lg [&_svg]:size-4',
                  item.tone,
                )}
              >
                <Icon aria-hidden="true" />
              </span>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-1 pb-3">
              <strong className="text-2xl font-bold tracking-tight text-foreground">
                {item.value}
              </strong>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
