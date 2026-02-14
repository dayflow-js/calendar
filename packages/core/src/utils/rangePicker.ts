import { Temporal } from 'temporal-polyfill';
import { isPlainDate } from './temporalTypeGuards';

const TOKEN_REGEX = /(YYYY|YY|MM|DD|HH|mm)/g;

export const pad = (input: number) => input.toString().padStart(2, '0');

const sanitizeFormatTemplate = (template: string): string => {
  return template.replace(/(H{1,2}):MM/g, (_match, hours) => `${hours}:mm`);
};

export const mergeFormatTemplate = (
  dateFormat: string,
  timeFormat: string
): string => {
  const trimmedTime = (timeFormat ?? '').trim();
  const hasTimeTokens = /[Hhms]/.test(dateFormat);
  const combined =
    hasTimeTokens || !trimmedTime
      ? dateFormat
      : `${dateFormat} ${trimmedTime}`.trim();
  return sanitizeFormatTemplate(combined);
};

const escapeRegExp = (value: string): string =>
  value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

export const buildParseRegExp = (template: string): RegExp => {
  let lastIndex = 0;
  let pattern = '^';
  let match: RegExpExecArray | null;

  while ((match = TOKEN_REGEX.exec(template)) !== null) {
    pattern += escapeRegExp(template.slice(lastIndex, match.index));
    const token = match[0];
    const length = token === 'YYYY' ? 4 : 2;
    pattern += `(?<${token}>\\d{${length}})`;
    lastIndex = match.index + token.length;
  }

  pattern += escapeRegExp(template.slice(lastIndex)) + '$';
  return new RegExp(pattern);
};

export const parseTemporalString = (
  input: string,
  regExp: RegExp,
  reference: Temporal.ZonedDateTime,
  zoneId: string
): Temporal.ZonedDateTime | null => {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(regExp);
  const groups = match?.groups as
    | Record<string, string | undefined>
    | undefined;

  if (!groups) {
    return null;
  }

  const resolvedYear = groups.YYYY
    ? Number(groups.YYYY)
    : groups.YY
      ? Number(groups.YY) + 2000
      : reference.year;

  const resolvedMonth = groups.MM ? Number(groups.MM) : reference.month;
  const resolvedDay = groups.DD ? Number(groups.DD) : reference.day;
  const resolvedHour = groups.HH ? Number(groups.HH) : reference.hour;
  const resolvedMinute = groups.mm ? Number(groups.mm) : reference.minute;

  try {
    return Temporal.ZonedDateTime.from({
      timeZone: zoneId,
      year: resolvedYear,
      month: resolvedMonth,
      day: resolvedDay,
      hour: resolvedHour,
      minute: resolvedMinute,
      second: reference.second,
      millisecond: reference.millisecond,
      microsecond: reference.microsecond,
      nanosecond: reference.nanosecond,
    });
  } catch {
    return null;
  }
};

export const getZoneId = (value: Temporal.ZonedDateTime): string => {
  const asAny = value as any;
  if (asAny.timeZoneId && typeof asAny.timeZoneId === 'string') {
    return asAny.timeZoneId;
  }
  if ('timeZoneId' in value && typeof value.timeZoneId === 'string') {
    return value.timeZoneId;
  }
  const tzObject = (value as any).timeZone;
  if (tzObject && typeof tzObject.id === 'string') {
    return tzObject.id;
  }
  if (typeof asAny.timeZone === 'string') {
    return asAny.timeZone;
  }
  return Temporal.Now.timeZoneId();
};

export const normalizeToZoned = (
  input: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  fallbackZone?: string,
  fallbackTemporal?: Temporal.ZonedDateTime
): Temporal.ZonedDateTime => {
  if (!input) {
    const zoneId =
      fallbackZone ??
      (fallbackTemporal
        ? getZoneId(fallbackTemporal)
        : Temporal.Now.timeZoneId());
    return fallbackTemporal ?? Temporal.Now.zonedDateTimeISO(zoneId);
  }

  if (isPlainDate(input)) {
    const zoneId = fallbackZone ?? Temporal.Now.timeZoneId();
    const isoString = `${input.year}-${pad(input.month)}-${pad(
      input.day
    )}T00:00:00[${zoneId}]`;
    return Temporal.ZonedDateTime.from(isoString);
  }

  // Check if PlainDateTime
  if ('hour' in input && !('timeZone' in input)) {
    const zoneId = fallbackZone ?? Temporal.Now.timeZoneId();
    // Try to use toZonedDateTime if available (proper PlainDateTime)
    if (typeof (input as any).toZonedDateTime === 'function') {
      try {
        return (input as Temporal.PlainDateTime).toZonedDateTime(zoneId);
      } catch {
        // Fall through to manual construction
      }
    }
    // Manual construction for PlainDateTime-like objects
    return Temporal.ZonedDateTime.from({
      timeZone: zoneId,
      year: (input as any).year,
      month: (input as any).month,
      day: (input as any).day,
      hour: (input as any).hour,
      minute: (input as any).minute,
      second: (input as any).second ?? 0,
      millisecond: (input as any).millisecond ?? 0,
      microsecond: (input as any).microsecond ?? 0,
      nanosecond: (input as any).nanosecond ?? 0,
    });
  }

  try {
    return Temporal.ZonedDateTime.from(input as any);
  } catch {
    const candidate = input as any;
    const resolvedZone =
      (typeof candidate?.timeZone === 'string'
        ? candidate.timeZone
        : candidate?.timeZone?.id) ??
      candidate?.timeZoneId ??
      fallbackZone ??
      (fallbackTemporal ? getZoneId(fallbackTemporal) : undefined) ??
      Temporal.Now.timeZoneId();

    if (typeof candidate?.toZonedDateTime === 'function') {
      try {
        return candidate.toZonedDateTime({ timeZone: resolvedZone });
      } catch {
        // fall through to manual construction
      }
    }

    const reference =
      fallbackTemporal ?? Temporal.Now.zonedDateTimeISO(resolvedZone);

    return Temporal.ZonedDateTime.from({
      timeZone: resolvedZone,
      year: candidate?.year ?? reference.year,
      month: candidate?.month ?? reference.month,
      day: candidate?.day ?? reference.day,
      hour: candidate?.hour ?? fallbackTemporal?.hour ?? 0,
      minute: candidate?.minute ?? fallbackTemporal?.minute ?? 0,
      second: candidate?.second ?? fallbackTemporal?.second ?? 0,
      millisecond: candidate?.millisecond ?? fallbackTemporal?.millisecond ?? 0,
      microsecond: candidate?.microsecond ?? fallbackTemporal?.microsecond ?? 0,
      nanosecond: candidate?.nanosecond ?? fallbackTemporal?.nanosecond ?? 0,
    });
  }
};

export const formatTemporal = (
  value: Temporal.ZonedDateTime,
  format: string,
  timeFormat: string
): string => {
  const template = mergeFormatTemplate(format, timeFormat);

  const replacements: Record<string, string> = {
    YYYY: value.year.toString(),
    YY: pad(value.year % 100),
    MM: pad(value.month),
    DD: pad(value.day),
    HH: pad(value.hour),
    mm: pad(value.minute),
  };

  return template.replace(TOKEN_REGEX, token => replacements[token] ?? token);
};
