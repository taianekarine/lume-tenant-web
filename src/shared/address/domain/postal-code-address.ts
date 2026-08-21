export interface PostalCodeAddress {
  readonly postalCode: string;
  readonly street: string;
  readonly complement: string;
  readonly district: string;
  readonly city: string;
  readonly state: string;
  readonly ibgeCode: string;
}

export type PostalCodeLookupFailure = 'invalid' | 'not-found' | 'unavailable';

export class PostalCodeLookupError extends Error {
  constructor(
    readonly reason: PostalCodeLookupFailure,
    message: string,
  ) {
    super(message);
    this.name = 'PostalCodeLookupError';
  }
}

export function postalCodeDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

export function isValidPostalCode(value: string): boolean {
  return /^\d{8}$/.test(postalCodeDigits(value));
}

export function formatPostalCode(value: string): string {
  const digits = postalCodeDigits(value);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}
