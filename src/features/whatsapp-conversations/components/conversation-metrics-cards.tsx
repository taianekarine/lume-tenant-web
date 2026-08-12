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
      tone: 'bg-success/10 text-success-emphasis',
    },
    {
      label: 'Atendente ativo',
      value: metrics.attendantActive,
      icon: Headset,
      tone: 'bg-info/10 text-info',
    },
    {
      label: 'Automação pausada',
      value: metrics.automationPaused,
      icon: PauseCircle,
      tone: 'bg-warning/10 text-warning-emphasis',
    },
    {
      label: 'Conversas não lidas',
      value: metrics.unreadConversations,
      icon: MessageCircle,
      tone: 'bg-primary/10 text-primary-emphasis',
    },
  ] as const;

  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4', className)}>
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
