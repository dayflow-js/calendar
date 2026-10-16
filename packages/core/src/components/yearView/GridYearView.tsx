import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'preact/hooks';

import {
  CalendarSystem,
  createCalendarDate,
  dateToCalendarDate,
} from '@/calendar/calendarSystem';
import ViewHeader from '@/components/common/ViewHeader';
import { useLocale } from '@/locale';
import { formatDateLabel } from '@/locale/intl';
import { monthViewContainer } from '@/styles/classNames';
import { Event, ICalendarApp, ViewType, YearViewConfig } from '@/types';
import {
  getTodayInTimeZone,
  temporalToVisualDate,
  generateUniKey,
  dateToZonedDateTime,
} from '@/utils';

import { GridDayPopup } from './GridDayPopup';

interface GridYearViewProps {
  app: ICalendarApp;
  config?: YearViewConfig;
}

/** Local `YYYY-MM-DD` key for a day cell. */
function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Day offset each arrow key moves the focused day cell by. */
const ARROW_DAY_OFFSETS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

/** Returns inline background color for event concentration using CSS variables */
function getIntensityStyle(
  count: number,
  levels: number
): { backgroundColor?: string } {
  if (count === 0) return {};
  const step = Math.min(count, levels);
  return { backgroundColor: `var(--heat-${step})` };
}

function getHeatLevel(count: number, levels: number): number {
  if (count === 0) return 0;
  return Math.min(count, levels);
}

/** Build a map from 'YYYY-MM-DD' → Event[] for events in the year */
function buildDayEventMap(
  events: Event[],
  year: number,
  showTimedEvents: boolean,
  appTimeZone?: string,
  calendarSystem: CalendarSystem = 'gregorian'
): Map<string, Event[]> {
  const map = new Map<string, Event[]>();

  const yearStart = createCalendarDate(year, 0, 1, calendarSystem);
  yearStart.setHours(0, 0, 0, 0);
  const yearEnd = new Date(
    createCalendarDate(year + 1, 0, 1, calendarSystem).getTime() - 1
  );

  for (const event of events) {
    if (!event.start) continue;
    if (!showTimedEvents && !event.allDay) continue;

    const start = temporalToVisualDate(event.start, appTimeZone);
    const end = event.end
      ? temporalToVisualDate(event.end, appTimeZone)
      : new Date(start);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (start > yearEnd || end < yearStart) continue;

    const clampedStart =
      start < yearStart ? new Date(yearStart) : new Date(start);
    const clampedEnd =
      end > yearEnd
        ? createCalendarDate(year + 1, 0, 0, calendarSystem)
        : new Date(end);
    clampedStart.setHours(0, 0, 0, 0);
    clampedEnd.setHours(0, 0, 0, 0);

    const DAY_MS = 24 * 60 * 60 * 1000;
    const startMs = clampedStart.getTime();
    const days = Math.round((clampedEnd.getTime() - startMs) / DAY_MS);
    for (let i = 0; i <= days; i++) {
      const d = new Date(startMs + i * DAY_MS);
      const key = toDayKey(d);
      const existing = map.get(key);
      if (existing) {
        existing.push(event);
      } else {
        map.set(key, [event]);
      }
    }
  }

  return map;
}

/** Calculate popup position from anchor element synchronously on click. */
function calcPopupPosition(anchorEl: HTMLElement): {
  top: number;
  left: number;
} {
  const rect = anchorEl.getBoundingClientRect();
  const POPUP_W = 256; // w-64
  const POPUP_H = 220; // generous estimate
  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.right + pad;
  if (left + POPUP_W > vw - pad) left = rect.left - POPUP_W - pad;
  left = Math.max(pad, Math.min(left, vw - POPUP_W - pad));

  let top = rect.top;
  if (top + POPUP_H > vh - pad) top = vh - POPUP_H - pad;
  top = Math.max(pad, top);

  return { top, left };
}

export const GridYearView = ({ app, config }: GridYearViewProps) => {
  const { t: translate, locale, getWeekDaysLabels: getLabels } = useLocale();
  const currentDate = app.getCurrentDate();
  const calendarSystem = app.state.calendarSystem;
  const currentYear = dateToCalendarDate(currentDate, calendarSystem).year;
  const rawEvents = app.getEvents();
  const startOfWeek = config?.startOfWeek ?? 1;
  const showTimedEvents = config?.showTimedEventsInYearView ?? false;
  const heatmapLevels = config?.gridHeatmapLevels ?? 5;
  const appTimeZone = app.timeZone;

  const today = useMemo(() => {
    const t = getTodayInTimeZone(appTimeZone);
    t.setHours(0, 0, 0, 0);
    return t;
  }, [appTimeZone]);

  // Popup state — position is pre-calculated on click so the popup renders
  // at the correct coordinates on its very first frame (no flash).
  const [popup, setPopup] = useState<{
    date: Date;
    monthIndex: number;
    anchorEl: HTMLElement;
    position: { top: number; left: number };
  } | null>(null);

  // Roving tabindex: the year grid is one Tab stop, and the arrow keys move
  // between days of the current year.
  const gridRef = useRef<HTMLDivElement>(null);
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);
  const isInCurrentYear = (date: Date) =>
    dateToCalendarDate(date, calendarSystem).year === currentYear;
  let tabStopDate = createCalendarDate(currentYear, 0, 1, calendarSystem);
  if (focusedDate && isInCurrentYear(focusedDate)) tabStopDate = focusedDate;
  else if (isInCurrentYear(currentDate)) tabStopDate = currentDate;
  const tabStopKey = toDayKey(tabStopDate);
  const gridClickOpensPopup = (config?.gridDateClick ?? 'popup') === 'popup';

  const handleDayKeyDown = (e: KeyboardEvent, date: Date) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).click();
      return;
    }
    const offset = ARROW_DAY_OFFSETS[e.key];
    if (offset === undefined) return;
    e.preventDefault();
    const next = new Date(date);
    next.setDate(next.getDate() + offset);
    if (!isInCurrentYear(next)) return;
    setFocusedDate(next);
    gridRef.current
      ?.querySelector<HTMLElement>(
        `[data-day-key='${toDayKey(next)}'][data-current-month='true']`
      )
      ?.focus();
  };

  // Click-outside handler for popup (also used by cells to close on outside click)
  useEffect(() => {
    if (!popup) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-grid-day-popup]')) return;
      if (target.closest('[data-grid-day-cell]')) return;
      setPopup(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popup]);

  // Heatmap event map (respects showTimedEvents filter)
  const heatmapEventMap = useMemo(
    () =>
      buildDayEventMap(
        rawEvents,
        currentYear,
        showTimedEvents,
        appTimeZone,
        calendarSystem
      ),
    [rawEvents, currentYear, showTimedEvents, appTimeZone, calendarSystem]
  );

  // Full event map for popup (shows all events regardless of filter)
  const fullEventMap = useMemo(
    () =>
      buildDayEventMap(
        rawEvents,
        currentYear,
        true,
        appTimeZone,
        calendarSystem
      ),
    [rawEvents, currentYear, appTimeZone, calendarSystem]
  );

  // Week day header labels (narrow: M T W T F S S)
  const weekDayLabels = useMemo(() => {
    const labels = getLabels(locale, 'narrow', startOfWeek);
    return labels.map(l =>
      locale.startsWith('zh') ? l.at(-1)! : l.charAt(0).toUpperCase()
    );
  }, [locale, getLabels, startOfWeek]);

  // Build 12 month data structures — always exactly 42 cells filled with real
  // dates (prev/next month overflow), like a standard calendar widget.
  const monthsData = useMemo(() => {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const monthStart = createCalendarDate(currentYear, m, 1, calendarSystem);
      const daysInMonth = dateToCalendarDate(
        createCalendarDate(currentYear, m + 1, 0, calendarSystem),
        calendarSystem
      ).day;
      const firstDayOfWeek = monthStart.getDay();
      const paddingStart = (firstDayOfWeek - startOfWeek + 7) % 7;

      const cells: Array<{ date: Date; isCurrentMonth: boolean }> = [];

      // Trailing days from previous month
      for (let i = paddingStart - 1; i >= 0; i--) {
        cells.push({
          date: createCalendarDate(currentYear, m, -i, calendarSystem),
          isCurrentMonth: false,
        });
      }
      // Current month days
      for (let d = 1; d <= daysInMonth; d++) {
        cells.push({
          date: createCalendarDate(currentYear, m, d, calendarSystem),
          isCurrentMonth: true,
        });
      }
      // Leading days from next month to reach exactly 42
      let nextDay = 1;
      while (cells.length < 42) {
        cells.push({
          date: createCalendarDate(
            currentYear,
            m + 1,
            nextDay++,
            calendarSystem
          ),
          isCurrentMonth: false,
        });
      }

      const monthName = monthStart.toLocaleDateString(locale, {
        month: 'long',
      });
      const formattedName =
        monthName.charAt(0).toUpperCase() + monthName.slice(1);

      months.push({ monthIndex: m, monthName: formattedName, cells });
    }
    return months;
  }, [currentYear, locale, startOfWeek, calendarSystem]);

  const handleDateClick = useCallback(
    (e: MouseEvent, date: Date, monthIndex: number) => {
      const clickAction = config?.gridDateClick ?? 'popup';

      if (typeof clickAction === 'function') {
        const key = toDayKey(date);
        clickAction(date, fullEventMap.get(key) ?? [], e);
        return;
      }

      if (clickAction === 'popup') {
        const anchorEl = e.currentTarget as HTMLElement;
        // Toggle: close if same cell (same date + same panel) is clicked again
        if (
          popup &&
          popup.date.getTime() === date.getTime() &&
          popup.monthIndex === monthIndex
        ) {
          setPopup(null);
        } else {
          setPopup({
            date,
            monthIndex,
            anchorEl,
            position: calcPopupPosition(anchorEl),
          });
        }
      } else if (clickAction === 'day-view') {
        app.setCurrentDate(date);
        app.changeView(ViewType.DAY);
      }
      // 'none' → do nothing
    },
    [config, app, popup, fullEventMap]
  );

  const handleDateDoubleClick = useCallback(
    (e: MouseEvent, date: Date) => {
      const dblClickAction = config?.gridDateDoubleClick ?? 'create-event';

      if (typeof dblClickAction === 'function') {
        const key = toDayKey(date);
        dblClickAction(date, fullEventMap.get(key) ?? [], e);
        return;
      }

      if (dblClickAction === 'create-event') {
        if (!app.canMutateFromUI()) return;
        const writableCal = app
          .getCalendarRegistry()
          .getDefaultWritableCalendar();
        if (!writableCal) return;

        const startTime = new Date(date);
        startTime.setHours(9, 0, 0, 0);
        const endTime = new Date(date);
        endTime.setHours(10, 0, 0, 0);

        const newEvent: Event = {
          id: generateUniKey(),
          title: translate('newEvent') || 'New Event',
          start: dateToZonedDateTime(startTime, appTimeZone),
          end: dateToZonedDateTime(endTime, appTimeZone),
          allDay: false,
          calendarId: writableCal.id,
        };
        setPopup(null);
        app.addEvent(newEvent);
        return;
      }

      if (dblClickAction === 'day-view') {
        setPopup(null);
        app.setCurrentDate(date);
        app.changeView(ViewType.DAY);
      }
      // 'none' → do nothing
    },
    [config, app, fullEventMap, translate, appTimeZone]
  );

  const getCustomTitle = () => {
    const isAsianLocale = locale.startsWith('zh') || locale.startsWith('ja');
    return isAsianLocale
      ? `${currentYear}年`
      : `${new Intl.NumberFormat(locale, { useGrouping: false }).format(currentYear)}`;
  };

  const popupEvents = useMemo(() => {
    if (!popup) return [];
    const key = toDayKey(popup.date);
    const events = fullEventMap.get(key) ?? [];
    return [...events].toSorted((a, b) => {
      const aAllDay = !!a.allDay;
      const bAllDay = !!b.allDay;
      if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;
      return 0;
    });
  }, [popup, fullEventMap]);

  return (
    <div className={monthViewContainer}>
      <ViewHeader
        calendar={app}
        viewType={ViewType.YEAR}
        currentDate={currentDate}
        customTitle={getCustomTitle()}
        onPrevious={() => {
          app.goToPrevious();
        }}
        onNext={() => {
          app.goToNext();
        }}
        onToday={() => app.goToToday()}
      />

      {/* 4-col × 3-row grid that fills all remaining space — no scroll */}
      <div
        ref={gridRef}
        className='df-year-grid'
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
        }}
      >
        {monthsData.map(month => (
          <div
            key={month.monthIndex}
            className='df-year-grid-month df-year-grid-month'
          >
            {/* Month name */}
            <div className='df-year-grid-month-title'>{month.monthName}</div>

            {/* Container for labels and cells to ensure alignment and fit */}
            <div className='df-year-grid-month-body'>
              <div
                className='df-year-grid-calendar'
                style={{
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gridTemplateRows: 'repeat(7, 1fr)',
                }}
              >
                {/* Day-of-week headers */}
                {weekDayLabels.map((label, i) => (
                  <div key={i} className='df-year-grid-weekday'>
                    {label}
                  </div>
                ))}

                {/* Day cells — exactly 42 cells (6 rows × 7 cols) */}
                {month.cells.map(({ date, isCurrentMonth }, i) => {
                  const key = toDayKey(date);
                  const eventCount = isCurrentMonth
                    ? (heatmapEventMap.get(key)?.length ?? 0)
                    : 0;
                  const heatLevel = getHeatLevel(eventCount, heatmapLevels);
                  const intensityStyle = isCurrentMonth
                    ? getIntensityStyle(eventCount, heatmapLevels)
                    : {};
                  const isToday = date.getTime() === today.getTime();
                  return (
                    <div
                      key={`${month.monthIndex}-${i}`}
                      data-grid-day-cell
                      data-day-key={key}
                      className='df-year-grid-day'
                      data-current-month={isCurrentMonth ? 'true' : 'false'}
                      style={intensityStyle}
                      // Overflow days repeat a neighbouring month's cells, so
                      // only current-month days are exposed and focusable.
                      aria-hidden={isCurrentMonth ? undefined : 'true'}
                      role={isCurrentMonth ? 'button' : undefined}
                      tabIndex={
                        isCurrentMonth
                          ? key === tabStopKey
                            ? 0
                            : -1
                          : undefined
                      }
                      aria-label={
                        isCurrentMonth
                          ? formatDateLabel(date, locale, {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : undefined
                      }
                      aria-current={
                        isCurrentMonth && isToday ? 'date' : undefined
                      }
                      aria-haspopup={
                        isCurrentMonth && gridClickOpensPopup
                          ? 'dialog'
                          : undefined
                      }
                      onKeyDown={
                        isCurrentMonth
                          ? (e: KeyboardEvent) => handleDayKeyDown(e, date)
                          : undefined
                      }
                      onFocus={
                        isCurrentMonth ? () => setFocusedDate(date) : undefined
                      }
                      onClick={e => handleDateClick(e, date, month.monthIndex)}
                      onDblClick={e =>
                        handleDateDoubleClick(e as unknown as MouseEvent, date)
                      }
                    >
                      <div className='df-year-grid-day-inner'>
                        <span
                          className='df-year-grid-day-number'
                          data-today={isToday ? 'true' : 'false'}
                          data-current-month={isCurrentMonth ? 'true' : 'false'}
                          data-has-events={eventCount > 0 ? 'true' : 'false'}
                          data-heat-level={String(heatLevel)}
                        >
                          {date.toLocaleDateString(locale, { day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {popup && (
        <GridDayPopup
          date={popup.date}
          events={popupEvents}
          anchorEl={popup.anchorEl}
          position={popup.position}
          onClose={() => setPopup(null)}
          locale={locale}
          app={app}
          appTimeZone={appTimeZone}
        />
      )}
    </div>
  );
};
