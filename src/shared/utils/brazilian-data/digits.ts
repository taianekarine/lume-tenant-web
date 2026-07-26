/**
 * Remove todos os caracteres que não sejam números.
 */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Verifica se o valor contém apenas números.
 */
export function containsOnlyDigits(value: string): boolean {
  return /^\d+$/.test(value);
}
