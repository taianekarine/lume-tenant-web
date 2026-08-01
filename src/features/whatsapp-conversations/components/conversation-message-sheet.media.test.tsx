import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { createWhatsAppConversationFixture } from '../testing/whatsapp-conversation-fixture';
import { ConversationMessageSheet } from './conversation-message-sheet';

const conversationId = '00000000-0000-4000-8000-000000000101';
const imageMessageId = '00000000-0000-4000-8000-000000000511';
const audioMessageId = '00000000-0000-4000-8000-000000000512';
const documentMessageId = '00000000-0000-4000-8000-000000000513';

function renderSheet() {
  const conversation = createWhatsAppConversationFixture({
    id: conversationId,
    messages: [
      {
        id: imageMessageId,
        direction: 'inbound',
        deliveryStatus: 'received',
        kind: 'image',
        text: null,
        attachment: {
          mimeType: 'image/jpeg',
          size: 1_024,
          url: 'https://cdn.example.test/imagem.enc',
          fileName: 'imagem.jpg.enc',
          metadata: {},
        },
        occurredAt: '2026-07-31T12:00:00.000Z',
        attempts: [],
      },
      {
        id: audioMessageId,
        direction: 'inbound',
        deliveryStatus: 'received',
        kind: 'audio',
        text: null,
        attachment: {
          mimeType: 'audio/ogg',
          size: 2_048,
          url: 'https://cdn.example.test/audio.ogg',
          fileName: 'audio.ogg',
          metadata: {},
        },
        occurredAt: '2026-07-31T12:01:00.000Z',
        attempts: [],
      },
      {
        id: documentMessageId,
        direction: 'inbound',
        deliveryStatus: 'received',
        kind: 'document',
        text: null,
        attachment: {
          mimeType: 'application/pdf',
          size: 4_096,
          url: null,
          fileName: 'documento.pdf.enc',
          metadata: {},
        },
        occurredAt: '2026-07-31T12:02:00.000Z',
        attempts: [],
      },
    ],
  });

  render(
    <ConversationMessageSheet
      conversation={conversation}
      open
      onOpenChange={jest.fn()}
      isLoading={false}
      isLoaded
      detailError=""
      onRetry={jest.fn()}
      onRefresh={jest.fn()}
      messageDraft=""
      onMessageDraftChange={jest.fn()}
      canSendMessage={false}
      canTakeOver={false}
      isTakingOver={false}
      onTakeOver={jest.fn()}
      isSendingMessage={false}
      onSendMessage={jest.fn()}
      feedbackMessage=""
      feedbackTone="neutral"
    />,
  );
}

describe('ConversationMessageSheet media proxy', () => {
  it('uses the authenticated proxy for encrypted or URL-less media and removes .enc', () => {
    renderSheet();

    const imageUrl =
      `/api/whatsapp-conversations/${conversationId}/messages/${imageMessageId}/content`;
    const documentUrl =
      `/api/whatsapp-conversations/${conversationId}/messages/${documentMessageId}/content`;

    expect(screen.getByAltText('imagem.jpg')).toHaveAttribute('src', imageUrl);
    expect(screen.getByText('documento.pdf')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir' })).toHaveAttribute(
      'href',
      documentUrl,
    );
    const downloadLinks = screen.getAllByRole('link', { name: 'Baixar' });
    expect(downloadLinks).toHaveLength(3);
    expect(
      downloadLinks.some(
        (link) => link.getAttribute('href') === `${documentUrl}?download=1`,
      ),
    ).toBe(true);
    expect(document.body).not.toHaveTextContent('.enc');
  });

  it('falls back to the proxy when direct audio playback fails', async () => {
    renderSheet();

    const audio = screen.getByLabelText('audio.ogg');
    expect(audio).toHaveAttribute('src', 'https://cdn.example.test/audio.ogg');

    fireEvent.error(audio);

    await waitFor(() =>
      expect(audio).toHaveAttribute(
        'src',
        `/api/whatsapp-conversations/${conversationId}/messages/${audioMessageId}/content`,
      ),
    );
  });
});
