import { useMemo, useState, useCallback, useEffect } from 'preact/hooks';

import ViewHeader from '@/components/common/ViewHeader';
import { useLocale } from '@/locale';
import { monthViewContainer } from '@/styles/classNames';
import { Event, ICalendarApp, ViewType, YearViewConfig } from '@/types';
import { getTodayInTimeZone, temporalToVisualDate } from '@/utils';

import { GridDayPopup } from './GridDayPopup';

interface GridYearViewProps {
  app: ICalendarApp;
  config?: YearViewConfig;
}

/** Returns inline background color for event concentration using CSS variables */
function getIntensityStyle(
  count: number,
  levels: number
): { backgroundColor?: string } {
  if (count === 0) return {};
  const step = Math.min(count, levels);
  return { backgroundColor: `var(--heat-${step})` };
}

/** Build a map from 'YYYY-MM-DD' → Event[] for events in the year */
function buildDayEventMap(
  events: Event[],
  year: number,
  showTimedEvents: boolean,
  appTimeZone?: string
): Map<string, Event[]> {
  const map = new Map<string, Event[]>();

  const yearStart = new Date(year, 0, 1);
  yearStart.setHours(0, 0, 0, 0);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

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
    const clampedEnd = end > yearEnd ? new Date(year, 11, 31) : new Date(end);
    clampedStart.setHours(0, 0, 0, 0);
    clampedEnd.setHours(0, 0, 0, 0);

    const DAY_MS = 24 * 60 * 60 * 1000;
    const startMs = clampedStart.getTime();
    const days = Math.round((clampedEnd.getTime() - startMs) / DAY_MS);
    for (let i = 0; i <= days; i++) {
      const d = new Date(startMs + i * DAY_MS);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  const { locale, getWeekDaysLabels: getLabels } = useLocale();
  const currentDate = app.getCurrentDate();
  const currentYear = currentDate.getFullYear();
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
      buildDayEventMap(rawEvents, currentYear, showTimedEvents, appTimeZone),
    [rawEvents, currentYear, showTimedEvents, appTimeZone]
  );

  // Full event map for popup (shows all events regardless of filter)
  const fullEventMap = useMemo(
    () => buildDayEventMap(rawEvents, currentYear, true, appTimeZone),
    [rawEvents, currentYear, appTimeZone]
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
      const monthStart = new Date(currentYear, m, 1);
      const daysInMonth = new Date(currentYear, m + 1, 0).getDate();
      const firstDayOfWeek = monthStart.getDay();
      const paddingStart = (firstDayOfWeek - startOfWeek + 7) % 7;

      const cells: Array<{ date: Date; isCurrentMonth: boolean }> = [];

      // Trailing days from previous month
      for (let i = paddingStart - 1; i >= 0; i--) {
        cells.push({
          date: new Date(currentYear, m, -i),
          isCurrentMonth: false,
        });
      }
      // Current month days
      for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ date: new Date(currentYear, m, d), isCurrentMonth: true });
      }
      // Leading days from next month to reach exactly 42
      let nextDay = 1;
      while (cells.length < 42) {
        cells.push({
          date: new Date(currentYear, m + 1, nextDay++),
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
  }, [currentYear, locale, startOfWeek]);

  const handleDateClick = useCallback(
    (e: MouseEvent, date: Date, monthIndex: number) => {
      const clickAction = config?.gridDateClick ?? 'popup';

      if (typeof clickAction === 'function') {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        clickAction(date, fullEventMap.get(key) ?? []);
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
    (date: Date) => {
      const dblClickAction = config?.gridDateDoubleClick ?? 'day-view';

      if (typeof dblClickAction === 'function') {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        dblClickAction(date, fullEventMap.get(key) ?? []);
        return;
      }

      if (dblClickAction === 'day-view') {
        setPopup(null);
        app.setCurrentDate(date);
        app.changeView(ViewType.DAY);
      }
      // 'none' → do nothing
    },
    [config, app, fullEventMap]
  );

  const getCustomTitle = () => {
    const isAsianLocale = locale.startsWith('zh') || locale.startsWith('ja');
    return isAsianLocale ? `${currentYear}年` : `${currentYear}`;
  };

  const popupEvents = useMemo(() => {
    if (!popup) return [];
    const key = `${popup.date.getFullYear()}-${String(popup.date.getMonth() + 1).padStart(2, '0')}-${String(popup.date.getDate()).padStart(2, '0')}`;
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
          const d = new Date(currentDate);
          d.setFullYear(d.getFullYear() - 1);
          app.setCurrentDate(d);
        }}
        onNext={() => {
          const d = new Date(currentDate);
          d.setFullYear(d.getFullYear() + 1);
          app.setCurrentDate(d);
        }}
        onToday={() => app.goToToday()}
      />

      {/* 4-col × 3-row grid that fills all remaining space — no scroll */}
      <div
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
                  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  const eventCount = isCurrentMonth
                    ? (heatmapEventMap.get(key)?.length ?? 0)
                    : 0;
                  const intensityStyle = isCurrentMonth
                    ? getIntensityStyle(eventCount, heatmapLevels)
                    : {};
                  const isToday = date.getTime() === today.getTime();

                  return (
                    <div
                      key={`${month.monthIndex}-${i}`}
                      data-grid-day-cell
                      className='df-year-grid-day'
                      data-current-month={isCurrentMonth ? 'true' : 'false'}
                      style={intensityStyle}
                      onClick={e => handleDateClick(e, date, month.monthIndex)}
                      onDblClick={() => handleDateDoubleClick(date)}
                    >
                      <div className='df-year-grid-day-inner'>
                        <span
                          className='df-year-grid-day-number'
                          data-today={isToday ? 'true' : 'false'}
                          data-current-month={isCurrentMonth ? 'true' : 'false'}
                          data-has-events={eventCount > 0 ? 'true' : 'false'}
                          data-strong-contrast={
                            eventCount >= 4 ? 'true' : 'false'
                          }
                        >
                          {date.getDate()}
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
          customContent={config?.gridPopupContent}
          appTimeZone={appTimeZone}
        />
      )}
    </div>
  );
};
