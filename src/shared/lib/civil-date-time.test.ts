import {
  combineBrazilianCivilDateTime,
  formatCivilDate,
  formatCivilDateTime,
  isValidCivilDate,
  splitBrazilianDateTime,
} from './civil-date-time';

describe('civil date and time formatting', () => {
  it('validates real calendar dates without converting them through a timezone', () => {
    expect(isValidCivilDate('2026-08-01')).toBe(true);
    expect(isValidCivilDate('2026-02-29')).toBe(false);
    expect(isValidCivilDate('01/08/2026')).toBe(false);
    expect(formatCivilDate('2026-08-01')).toBe('01/08/2026');
  });

  it('shows an explicit missing-time label when only the civil date is known', () => {
    expect(formatCivilDateTime('2026-08-01', null)).toBe('01/08/2026 · horário não informado');
  });

  it('uses the civil date as the date source when a timestamp also exists', () => {
    expect(formatCivilDateTime('2026-08-01', '2026-08-01T13:30:00.000Z')).toBe('01/08/2026, 10:30');
  });

  it('combina e separa data civil e horário no fuso operacional', () => {
    expect(combineBrazilianCivilDateTime('2026-08-01', '')).toBeNull();
    expect(combineBrazilianCivilDateTime('2026-08-01', '10:30')).toBe('2026-08-01T13:30:00.000Z');
    expect(splitBrazilianDateTime('2026-08-01T13:30:00.000Z')).toEqual({
      date: '2026-08-01',
      time: '10:30',
    });
  });
});
