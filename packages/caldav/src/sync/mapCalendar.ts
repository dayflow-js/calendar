import type { CalDAVCalendar } from '@caldav/types/calendar';
import type { CalendarType } from '@dayflow/core';
import { getCalendarColorsForHex } from '@dayflow/core';

/**
 * Map a CalDAV calendar to a DayFlow CalendarType.
 *
 * Permission mapping is conservative: if `current-user-privilege-set` was absent
 * from the PROPFIND response (e.g. Radicale), `readOnly` will be `true`.
 */
export function mapCalDAVCalendarToDayFlow(
  calendar: CalDAVCalendar
): CalendarType {
  const { colors, darkColors } = getCalendarColorsForHex(
    calendar.color ?? '#3b82f6'
  );

  const perms = calendar.permissions;
  const hasWritePermission =
    perms?.canCreate === true ||
    perms?.canUpdate === true ||
    perms?.canDelete === true;

  const readOnly = calendar.readOnly ?? !hasWritePermission;

  return {
    id: calendar.id,
    name: calendar.name,
    source: 'CalDAV',
    isVisible: true,
    readOnly,
    colors,
    darkColors,
  };
}
