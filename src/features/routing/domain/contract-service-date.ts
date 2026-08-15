import type { RoutingContract } from './routing';

const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function isContractServiceDate(
  contract: Pick<RoutingContract, 'validFrom' | 'validUntil' | 'shifts'>,
  serviceDate: string,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) return false;
  if (serviceDate < contract.validFrom) return false;
  if (contract.validUntil && serviceDate > contract.validUntil) return false;
  const weekday = dateOnly(serviceDate).getUTCDay();
  return contract.shifts.some(
    (shift) => shift.activeWeekdays.length === 0 || shift.activeWeekdays.includes(weekday),
  );
}

export function nextContractServiceDate(
  contract: Pick<RoutingContract, 'validFrom' | 'validUntil' | 'shifts'>,
  referenceDate: string,
): string | null {
  const firstDate = referenceDate > contract.validFrom ? referenceDate : contract.validFrom;
  const candidate = dateOnly(firstDate);
  for (let offset = 0; offset < 14; offset += 1) {
    const value = formatDate(candidate);
    if (contract.validUntil && value > contract.validUntil) return null;
    if (isContractServiceDate(contract, value)) return value;
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return null;
}

export function contractActiveWeekdays(contract: Pick<RoutingContract, 'shifts'>): string {
  if (contract.shifts.some((shift) => shift.activeWeekdays.length === 0)) {
    return 'Todos os dias';
  }
  const weekdays = new Set(contract.shifts.flatMap((shift) => shift.activeWeekdays));
  return weekdayLabels.filter((_, weekday) => weekdays.has(weekday)).join(', ');
}
