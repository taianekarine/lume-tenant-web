const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const BRAZILIAN_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Sao_Paulo',
});

const BRAZILIAN_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const BRAZILIAN_DATE_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Sao_Paulo',
});

export function isValidCivilDate(value: string): boolean {
  const match = CIVIL_DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function formatCivilDate(value: string | null | undefined): string | null {
  if (!value || !isValidCivilDate(value)) return null;

  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function formatCivilDateTime(
  civilDate: string | null | undefined,
  dateTime: string | null | undefined,
  emptyLabel = 'Não informado',
): string {
  const formattedCivilDate = formatCivilDate(civilDate);

  if (dateTime) {
    const parsedDateTime = new Date(dateTime);
    if (Number.isFinite(parsedDateTime.valueOf())) {
      if (formattedCivilDate) {
        return `${formattedCivilDate}, ${BRAZILIAN_TIME_FORMATTER.format(parsedDateTime)}`;
      }

      return BRAZILIAN_DATE_TIME_FORMATTER.format(parsedDateTime);
    }
  }

  return formattedCivilDate ? `${formattedCivilDate} · horário não informado` : emptyLabel;
}

export function splitBrazilianDateTime(
  value: string | null | undefined,
): { date: string; time: string } | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) return null;
  const parts = BRAZILIAN_DATE_PARTS_FORMATTER.formatToParts(parsed);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  const date = `${part('year')}-${part('month')}-${part('day')}`;
  const time = `${part('hour')}:${part('minute')}`;
  return isValidCivilDate(date) ? { date, time } : null;
}

export function combineBrazilianCivilDateTime(
  civilDate: string,
  time: string | null | undefined,
): string | null {
  if (!isValidCivilDate(civilDate) || !time?.trim()) return null;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return new Date(`${civilDate}T${time}:00-03:00`).toISOString();
}
