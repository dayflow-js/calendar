# Calendar systems

DayFlow supports `calendarSystem: 'gregorian' | 'jalali'`. Gregorian is the
default. Calendar selection is independent of language, timezone, and the first
weekday: an application can display Jalali dates with English labels, or
Gregorian dates with Persian labels.
Jalali display dates omit the redundant era label (such as `AP` in English).
Gregorian mode preserves the supplied locale verbatim, including its default or
explicit calendar preference, for backward compatibility. Only Jalali mode adds
the Persian calendar override; other locale preferences, such as numbering,
remain intact. Pass an explicit Gregorian locale (for example,
`fa-IR-u-ca-gregory`) when Gregorian labels are desired for a locale whose default
calendar is not Gregorian.

```tsx
import {
  DayFlowCalendar,
  useCalendarApp,
  createMonthView,
  createWeekView,
  createDayView,
  createAgendaView,
  createYearView,
} from '@dayflow/react';
import { createLocalizationPlugin, fa } from '@dayflow/plugin-localization';

const calendar = useCalendarApp({
  calendarSystem: 'jalali',
  locale: 'fa-IR',
  timeZone: 'Asia/Tehran',
  plugins: [createLocalizationPlugin({ locales: [fa] })],
  views: [
    createMonthView({ startOfWeek: 6 }),
    createWeekView({ startOfWeek: 6 }),
    createDayView(),
    createAgendaView(),
    createYearView({ mode: 'grid', startOfWeek: 6 }),
  ],
});

return <DayFlowCalendar calendar={calendar} />;
```

The `fa` localization pack supplies Persian UI messages. Jalali month/day labels
and leap-year arithmetic use the existing Temporal polyfill and the platform's
Persian calendar. Year views support `grid`, `fixed-week`, and `year-canvas` modes.
Saturday is weekday `6`; set `startOfWeek` explicitly to choose it. Locale and
calendar selection do not impose a regional policy on the host application.

## Date identity and editing

Event inputs, callbacks, ICS data, and recurrence rules keep their ISO date and
timezone semantics. Selecting Farvardin 1, 1404 selects March 21, 2025; it does
not construct an ISO date in the year 1404. Switching calendars changes display
and navigation without mutating events or firing event update callbacks.

The standalone `@dayflow/ui-range-picker` also accepts `calendarSystem`. Its
formatted strings use the selected calendar, and its returned Temporal values
use ISO calendar fields. Date input accepts Latin, Persian, and Arabic digits.

Existing monthly/yearly recurrence rules continue to use their Gregorian/ISO
rules. This option does not create a new Persian recurrence format or reinterpret
saved rules. For example, a monthly ISO event on March 21 continues on April 21,
even though the corresponding Jalali day can change.

Core date helpers (`dateToCalendarDate`, `calendarDateToDate`,
`startOfCalendarMonth`, `addCalendarMonths`, `daysInCalendarMonth`) use local
`Date` fields as wall-calendar dates, just like DayFlow's visual date adapters.
Project an event into the display timezone before passing it to these helpers.
Conversion rejects invalid dates; month navigation constrains end-of-month days
to the target month's length. ISO event keys and drag targets stay absolute.

## Standalone preview

From the DayFlow repository:

```sh
pnpm install --frozen-lockfile
pnpm dev:jalali
```

Open [the Jalali example](http://127.0.0.1:5529/jalali.html). It starts at Nowruz
1404 with synthetic all-day and timed events. Controls switch calendar systems,
Persian/English labels, and paged/scrolling month layouts. It runs from DayFlow
source without requiring a host application or a published package.

Regression coverage is in `packages/core/src/calendar/__tests__`: complete
leap/common-year conversion, constrained navigation, event identity, framework
config synchronization, ISO selection, week metadata, all year layouts,
fixed-week event placement, and date-picker editing.
