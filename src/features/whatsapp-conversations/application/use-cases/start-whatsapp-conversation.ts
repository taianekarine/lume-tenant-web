import type { WhatsAppConversationRepository } from '../contracts';

export function startWhatsAppConversation(
  repository: WhatsAppConversationRepository,
  phone: unknown,
) {
  if (typeof phone !== 'string') return Promise.resolve(null);
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return Promise.resolve(null);

  return repository.startConversation(digits);
}
