import { formatPostalCode, isValidPostalCode, postalCodeDigits } from './postal-code-address';

describe('Brazilian postal code', () => {
  it('normalizes and formats a CEP with at most eight digits', () => {
    expect(postalCodeDigits('01.001-000 extra')).toBe('01001000');
    expect(formatPostalCode('01001000')).toBe('01001-000');
  });

  it('accepts only a complete eight-digit CEP', () => {
    expect(isValidPostalCode('01001-000')).toBe(true);
    expect(isValidPostalCode('0100100')).toBe(false);
  });
});
