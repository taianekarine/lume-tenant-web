import { onlyDigits } from './digits';

/**
 * Remove todos os caracteres de formatação do telefone.
 *
 * Não adiciona nem remove o código do país automaticamente.
 *
 * @example
 * normalizePhone("(34) 99999-9999");
 * // "34999999999"
 *
 * @example
 * normalizePhone("+55 (34) 99999-9999");
 * // "5534999999999"
 */
export function normalizePhone(value: string): string {
  return onlyDigits(value);
}

/**
 * Retorna o número brasileiro sem o código do país.
 */
function removeBrazilCountryCode(value: string): string {
  const phone = normalizePhone(value);

  if (phone.startsWith('55') && (phone.length === 12 || phone.length === 13)) {
    return phone.slice(2);
  }

  return phone;
}

/**
 * Formata telefone fixo ou celular brasileiro.
 *
 * Formatos aceitos:
 * - 10 dígitos: telefone fixo com DDD;
 * - 11 dígitos: celular com DDD;
 * - 12 ou 13 dígitos: telefone com código do Brasil.
 *
 * @example
 * formatPhone("3433334444");
 * // "(34) 3333-4444"
 *
 * @example
 * formatPhone("34999999999");
 * // "(34) 99999-9999"
 *
 * @example
 * formatPhone("5534999999999");
 * // "+55 (34) 99999-9999"
 */
export function formatPhone(value: string): string {
  const phone = normalizePhone(value);
  const hasBrazilCountryCode =
    phone.startsWith('55') && (phone.length === 12 || phone.length === 13);

  const localPhone = hasBrazilCountryCode ? phone.slice(2) : phone;

  const countryCode = hasBrazilCountryCode ? '+55 ' : '';

  if (localPhone.length === 10) {
    return localPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, `${countryCode}($1) $2-$3`);
  }

  if (localPhone.length === 11) {
    return localPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, `${countryCode}($1) $2-$3`);
  }

  return phone;
}

/**
 * Verifica a estrutura básica de um telefone brasileiro.
 *
 * A validação confirma:
 * - DDD com dois dígitos e sem iniciar em zero;
 * - telefone fixo com oito dígitos;
 * - celular com nove dígitos;
 * - celular iniciado pelo número 9.
 */
export function validatePhone(value: string): boolean {
  const phone = removeBrazilCountryCode(value);

  if (!/^[1-9]\d{9,10}$/.test(phone)) {
    return false;
  }

  const number = phone.slice(2);

  if (number.length === 9 && !number.startsWith('9')) {
    return false;
  }

  return number.length === 8 || number.length === 9;
}
