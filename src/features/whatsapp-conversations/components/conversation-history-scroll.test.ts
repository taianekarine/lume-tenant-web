import { resolveConversationHistoryScrollTop } from './conversation-history-scroll';

describe('conversation history scroll', () => {
  it('opens every selected conversation at the latest message', () => {
    expect(
      resolveConversationHistoryScrollTop({
        openingHistory: true,
        prependedMessages: false,
        appendedMessages: false,
        wasNearBottom: false,
        currentScrollHeight: 1_200,
        previousScrollHeight: 0,
        previousScrollTop: 0,
      }),
    ).toBe(1_200);
  });

  it('preserves the reading position when older messages are prepended', () => {
    expect(
      resolveConversationHistoryScrollTop({
        openingHistory: false,
        prependedMessages: true,
        appendedMessages: false,
        wasNearBottom: false,
        currentScrollHeight: 1_500,
        previousScrollHeight: 1_200,
        previousScrollTop: 180,
      }),
    ).toBe(480);
  });

  it('does not pull a reader away from older messages when a new message arrives', () => {
    expect(
      resolveConversationHistoryScrollTop({
        openingHistory: false,
        prependedMessages: false,
        appendedMessages: true,
        wasNearBottom: false,
        currentScrollHeight: 1_500,
        previousScrollHeight: 1_400,
        previousScrollTop: 200,
      }),
    ).toBeNull();
  });
});
