import { getCalendarColorsForHex } from '@/core/calendarRegistry';
import { CalendarType, Event } from '@/types';
import { parseICS } from '@/utils/ics/icsParser';
import { generateUniKey } from '@/utils/utilityFunctions';

export interface SubscribeResult {
  calendar: CalendarType;
  events: Event[];
}

/**
 * Utility to fetch and parse a calendar subscription.
 * Does not perform any storage operations.
 */
export async function subscribeCalendar(url: string): Promise<SubscribeResult> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const icsContent = await response.text();

  const result = parseICS(icsContent);

  // Extract REAL calendar name from ICS or fallback to hostname
  const nameMatch = icsContent.match(/X-WR-CALNAME[^:]*:([^\r\n]+)/);
  const calendarName = nameMatch ? nameMatch[1].trim() : new URL(url).hostname;

  const presetColors = [
    '#3b82f6',
    '#10b981',
    '#8b5cf6',
    '#f59e0b',
    '#ef4444',
    '#f97316',
    '#ec4899',
    '#14b8a6',
    '#6366f1',
    '#6b7280',
  ];
  const randomColor =
    presetColors[Math.floor(Math.random() * presetColors.length)];
  const { colors, darkColors } = getCalendarColorsForHex(randomColor);

  return {
    calendar: {
      id: generateUniKey(),
      name: calendarName,
      source: 'Subscription',
      isVisible: true,
      colors,
      darkColors,
      subscription: {
        url,
        status: 'ready',
      },
    } as CalendarType,
    events: result.events,
  };
}
