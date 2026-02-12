import { temporalToDate } from './temporal';
import { CalendarSearchEvent } from '../types/search';

/**
 * Helper to get date object from event start
 * @param dateInput Date, string, or Temporal object
 * @returns Date object
 */
export const getDateObj = (dateInput: any): Date => {
  try {
    if (dateInput instanceof Date) return dateInput;
    if (typeof dateInput === 'string') return new Date(dateInput);
    return temporalToDate(dateInput);
  } catch {
    return new Date();
  }
};

/**
 * Helper to normalize date (reset time to 00:00:00)
 * @param date Date object
 * @returns Normalized Date object
 */
export const normalizeDate = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Helper to get header text and color for a date group in search results
 * @param groupDate The date of the group
 * @param today Reference today date (normalized)
 * @param locale Locale string
 * @param t Translation function
 * @returns Object with title and colorClass
 */
export const getSearchHeaderInfo = (
  groupDate: Date,
  today: Date,
  locale: string,
  t: (key: any) => string
): { title: string; colorClass: string } => {
  const diffTime = groupDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let title = '';
  let colorClass = 'text-gray-500 dark:text-gray-400'; // Default gray

  if (diffDays === 0) {
    // Today
    title = t('today') || 'Today';
    colorClass = 'text-primary'; // Primary color
  } else if (diffDays === 1 || diffDays === 2) {
    // Tomorrow or Day after tomorrow
    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      const relative = rtf.format(diffDays, 'day');
      title = relative.charAt(0).toUpperCase() + relative.slice(1);
      colorClass = 'text-black dark:text-white'; // Black/White for tomorrow/day after
    } catch (e) {
      title = groupDate.toLocaleDateString(locale, { weekday: 'long' });
    }
  } else {
    // Others
    title = groupDate.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }

  return { title, colorClass };
};

/**
 * Helper to group search results by date
 * @param results List of search events
 * @param today Reference today date (normalized)
 * @returns Array of grouped events
 */
export const groupSearchResults = (
  results: CalendarSearchEvent[],
  today: Date
): Array<{ date: Date; events: CalendarSearchEvent[] }> => {
  const groupsMap = new Map<number, { date: Date; events: CalendarSearchEvent[] }>();

  results.forEach(event => {
    const dateObj = getDateObj(event.start);
    const normalized = normalizeDate(dateObj);
    const timeKey = normalized.getTime();

    if (!groupsMap.has(timeKey)) {
      groupsMap.set(timeKey, { date: normalized, events: [] });
    }
    groupsMap.get(timeKey)?.events.push(event);
  });

  // Ensure "Today" group exists
  const todayKey = today.getTime();
  if (!groupsMap.has(todayKey)) {
    groupsMap.set(todayKey, { date: today, events: [] });
  }

  // Sort groups by time
  const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

  return sortedGroups;
};
