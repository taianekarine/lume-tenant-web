import { render, screen, within } from '@testing-library/react';

import { createWhatsAppConversationFixture } from '../testing/whatsapp-conversation-fixture';
import { ConversationMetricsCards } from './conversation-metrics-cards';

describe('ConversationMetricsCards', () => {
  it('shows unread conversations in compact metric cards', () => {
    render(
      <ConversationMetricsCards
        conversations={[
          createWhatsAppConversationFixture({
            id: 'unread-conversation',
            unreadCount: 4,
          }),
          createWhatsAppConversationFixture({
            id: 'read-conversation',
            unreadCount: 0,
          }),
        ]}
      />,
    );

    const unreadLabel = screen.getByText('Conversas não lidas');
    const unreadCard = unreadLabel.closest('[data-slot="card"]');

    expect(screen.queryByText('Mensagens não lidas')).not.toBeInTheDocument();
    expect(unreadCard).toHaveAttribute('data-size', 'sm');
    expect(within(unreadCard as HTMLElement).getByText('1')).toBeInTheDocument();
    expect(unreadCard?.querySelector('[data-slot="card-header"]')).toHaveClass('pt-3');
    expect(unreadCard?.querySelector('[data-slot="card-content"] strong')).toHaveClass('text-2xl');
  });
});
