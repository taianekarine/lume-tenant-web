import { onlyDigits } from './digits';

/**
 * Remove caracteres que não sejam números.
 *
 * @example
 * normalizeCnh("012 345 678 90");
 * // "01234567890"
 */
export function normalizeCnh(value: string): string {
  return onlyDigits(value);
}

/**
 * Calcula os dois dígitos verificadores da CNH.
 */
function calculateCheckDigits(base: string): string {
  let firstTotal = 0;
  let secondTotal = 0;

  for (let index = 0; index < 9; index += 1) {
    const digit = Number(base[index]);

    firstTotal += digit * (9 - index);
    secondTotal += digit * (index + 1);
  }

  const firstRemainder = firstTotal % 11;
  const adjustment = firstRemainder === 10 ? 2 : 0;

  const firstCheckDigit = firstRemainder > 9 ? 0 : firstRemainder;

  let secondCheckDigit = (secondTotal % 11) - adjustment;

  if (secondCheckDigit < 0) {
    secondCheckDigit += 11;
  }

  if (secondCheckDigit > 9) {
    secondCheckDigit = 0;
  }

  return `${firstCheckDigit}${secondCheckDigit}`;
}

/**
 * Verifica o formato e os dígitos verificadores da CNH.
 *
 * Esta função não consulta a base da Senatran.
 */
export function validateCnh(value: string): boolean {
  const cnh = normalizeCnh(value);

  if (!/^\d{11}$/.test(cnh)) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(cnh)) {
    return false;
  }

  const base = cnh.slice(0, 9);
  const checkDigits = cnh.slice(9);

  return calculateCheckDigits(base) === checkDigits;
}
