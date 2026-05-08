import type { CalendarType } from '@dayflow/core';
import { getCalendarColorsForHex } from '@dayflow/core';
import type { GoogleCalendarListEntry } from '@google-sync/types/api';

/**
 * Map a Google CalendarListEntry to a DayFlow CalendarType.
 */
export function mapGoogleCalendarToDayFlow(
  entry: GoogleCalendarListEntry
): CalendarType {
  const colorResult = entry.backgroundColor
    ? getCalendarColorsForHex(entry.backgroundColor)
    : getCalendarColorsForHex('#4285F4'); // Google blue fallback

  const readOnly =
    entry.accessRole === 'reader' || entry.accessRole === 'freeBusyReader';

  return {
    id: entry.id,
    name: entry.summary,
    source: 'Google',
    readOnly,
    colors: colorResult.colors,
    ...(colorResult.darkColors ? { darkColors: colorResult.darkColors } : {}),
    subscription: {
      url: `google:${entry.id}`,
      status: 'ready',
      meta: {
        google: {
          calendarId: entry.id,
          accessRole: entry.accessRole,
          primary: entry.primary ?? false,
        },
      },
    },
  };
}
