interface ResolveConversationHistoryScrollTopInput {
  readonly openingHistory: boolean;
  readonly prependedMessages: boolean;
  readonly appendedMessages: boolean;
  readonly wasNearBottom: boolean;
  readonly currentScrollHeight: number;
  readonly previousScrollHeight: number;
  readonly previousScrollTop: number;
}

export function resolveConversationHistoryScrollTop({
  openingHistory,
  prependedMessages,
  appendedMessages,
  wasNearBottom,
  currentScrollHeight,
  previousScrollHeight,
  previousScrollTop,
}: ResolveConversationHistoryScrollTopInput): number | null {
  if (openingHistory) return currentScrollHeight;

  if (prependedMessages) {
    return previousScrollTop + currentScrollHeight - previousScrollHeight;
  }

  if (appendedMessages && wasNearBottom) return currentScrollHeight;

  return null;
}
