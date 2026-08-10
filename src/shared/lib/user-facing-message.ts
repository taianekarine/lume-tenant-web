const TECHNICAL_MESSAGE_PATTERN =
  /(?:\bapi\b|\bn8n\b|\bprovedor\b|\bprovider\b|\bevolution\b|\bprisma\b|\bpostgres(?:ql)?\b|\bhttp\s*\d{3}\b|\bstatus\s+\d{3}\b|\bcódigo (?:do erro|de erro)\b|\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b)/i;

export function userFacingMessage(message: string, fallback: string): string {
  const normalized = message.trim();
  return normalized && !TECHNICAL_MESSAGE_PATTERN.test(normalized) ? normalized : fallback;
}
