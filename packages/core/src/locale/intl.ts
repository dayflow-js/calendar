/**
 * Encapsulates Intl API calls for standard calendar terms.
 */
export function getIntlLabel(
  key: 'today' | 'day' | 'week' | 'month' | 'year',
  locale: string
): string | null {
  try {
    if (key === 'today') {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      return (
        rtf.formatToParts(0, 'day').find(p => p.type === 'literal')?.value ??
        null
      );
    }

    if (key === 'week') {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
      return (
        rtf.formatToParts(1, 'week').find(p => p.type === 'unit')?.value ?? null
      );
    }

    const dn = new Intl.DisplayNames(locale, { type: 'dateTimeField' });
    return dn.of(key) ?? null;
  } catch {
    return null;
  }
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get localized weekday labels starting from startOfWeek (0: Sun, 1: Mon, etc.)
 */
export const getWeekDaysLabels = (
  locale: string,
  format: 'long' | 'short' | 'narrow' = 'short',
  startOfWeek: number = 1
): string[] => {
  const labels: string[] = [];
  // Use a known date (2024-01-07 was a Sunday)
  const baseDate = new Date(2024, 0, 7);
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + startOfWeek + i);
    try {
      labels.push(date.toLocaleDateString(locale, { weekday: format }));
    } catch {
      labels.push(date.toLocaleDateString('en-US', { weekday: format }));
    }
  }
  return labels;
};

/**
 * Get localized month labels
 */
export const getMonthLabels = (
  locale: string,
  format: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit' = 'long'
): string[] => {
  const labels: string[] = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(2024, i, 1);
    try {
      labels.push(date.toLocaleDateString(locale, { month: format }));
    } catch {
      labels.push(date.toLocaleDateString('en-US', { month: format }));
    }
  }
  return labels;
};
