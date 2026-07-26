import {
  canSendHumanWhatsAppMessage,
  canWhatsAppBotReply,
  isWhatsAppAwaitingProposal,
  isWhatsAppBotBlocked,
  isWhatsAppConversationDepartment,
  isWhatsAppConversationFlowStep,
  isWhatsAppConversationState,
  isWhatsAppQuoteSummaryConfirmed,
  isWhatsAppRequestStatus,
  WHATSAPP_CONVERSATION_DEPARTMENTS,
  WHATSAPP_CONVERSATION_FLOW_STEPS,
  WHATSAPP_CONVERSATION_STATES,
  WHATSAPP_REQUEST_STATUSES,
} from './whatsapp-conversation';
import { createWhatsAppConversationFixture } from '../../testing/whatsapp-conversation-fixture';

describe('WhatsApp conversation domain', () => {
  it.each(WHATSAPP_CONVERSATION_DEPARTMENTS)('accepts the %s department', (department) => {
    expect(isWhatsAppConversationDepartment(department)).toBe(true);
  });

  it.each(WHATSAPP_CONVERSATION_STATES)('accepts the %s conversation state', (state) => {
    expect(isWhatsAppConversationState(state)).toBe(true);
  });

  it.each(WHATSAPP_CONVERSATION_FLOW_STEPS)('accepts the %s flow step', (flowStep) => {
    expect(isWhatsAppConversationFlowStep(flowStep)).toBe(true);
  });

  it.each(WHATSAPP_REQUEST_STATUSES)('accepts the %s request status', (status) => {
    expect(isWhatsAppRequestStatus(status)).toBe(true);
  });

  it.each(['new', '', null, undefined, 1])('rejects invalid taxonomy values %p', (value) => {
    expect(isWhatsAppConversationDepartment(value)).toBe(false);
    expect(isWhatsAppConversationState(value)).toBe(false);
    expect(isWhatsAppConversationFlowStep(value)).toBe(false);
    expect(isWhatsAppRequestStatus(value)).toBe(false);
  });

  it('allows automated replies only while the bot is active', () => {
    expect(canWhatsAppBotReply('bot-active')).toBe(true);

    for (const state of WHATSAPP_CONVERSATION_STATES) {
      if (state !== 'bot-active') {
        expect(canWhatsAppBotReply(state)).toBe(false);
      }
    }
  });

  it('blocks the bot in every canonical state except bot-active', () => {
    for (const conversationState of WHATSAPP_CONVERSATION_STATES) {
      expect(isWhatsAppBotBlocked(createWhatsAppConversationFixture({ conversationState }))).toBe(
        conversationState !== 'bot-active',
      );
    }
  });

  it('allows a human reply only in human-active with an assigned operator', () => {
    const assigned = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      assignedTo: { id: 'employee-001', name: 'Atendente Comercial' },
    });

    expect(canSendHumanWhatsAppMessage(assigned)).toBe(true);
    expect(canSendHumanWhatsAppMessage({ ...assigned, assignedTo: null })).toBe(false);
    expect(
      canSendHumanWhatsAppMessage({
        ...assigned,
        conversationState: 'sent-to-human',
      }),
    ).toBe(false);
    expect(
      canSendHumanWhatsAppMessage({
        ...assigned,
        conversationState: 'bot-active',
      }),
    ).toBe(false);
  });

  it('recognizes a confirmed request awaiting a proposal and after a second contact', () => {
    const awaitingProposal = createWhatsAppConversationFixture({
      conversationState: 'sent-to-human',
      flowStep: 'quote-send-pending',
      requestStatus: 'under-review',
    });
    const secondContact = createWhatsAppConversationFixture({
      conversationState: 'bot-active',
      flowStep: 'commercial-follow-up-menu',
      requestStatus: 'under-review',
    });

    expect(isWhatsAppAwaitingProposal(awaitingProposal)).toBe(true);
    expect(isWhatsAppQuoteSummaryConfirmed(awaitingProposal)).toBe(true);
    expect(isWhatsAppQuoteSummaryConfirmed(secondContact)).toBe(true);
    expect(isWhatsAppAwaitingProposal(secondContact)).toBe(false);
  });
});
