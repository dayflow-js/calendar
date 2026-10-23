import { RefObject } from 'preact';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';

import { EventDetailPanel } from '@/components/calendarEvent/components/EventDetailPanel';
import { TaskCheckbox } from '@/components/calendarEvent/components/TaskCheckbox';
import { TaskPriorityIndicator } from '@/components/common/TaskPriorityIndicator';
import ViewHeader from '@/components/common/ViewHeader';
import { useResponsiveMonthConfig } from '@/hooks/virtualScroll';
import { useLocale } from '@/locale';
import { formatDateLabel, formatDateRangeLabel } from '@/locale/intl';
import { ContentSlot } from '@/renderer/ContentSlot';
import { CustomRenderingContext } from '@/renderer/CustomRenderingContext';
import { AgendaViewProps, Event, ICalendarApp } from '@/types';
import {
  compareAllDayDisplayPriority,
  formatTime,
  formatTimeRangeFormatted,
  getEventBgColor,
  getEventTextColor,
  getTodayInTimeZone,
  getLineColor,
  getPrimaryCalendarId,
  temporalToVisualDate,
} from '@/utils';
import {
  getTaskPriorityBackground,
  getTaskPriorityTextColor,
  isTask,
} from '@/utils/taskUtils';

type AgendaEntry = {
  event: Event;
  timeLabel: string;
  sortMs: number;
  renderAsBadge: boolean;
  isAllDay: boolean;
  isMultiDayAllDay: boolean;
  continuesFromPreviousDay: boolean;
  continuesToNextDay: boolean;
  color: string;
  backgroundColor: string;
  textColor: string;
};

type AgendaDayGroup = {
  date: Date;
  allDayEntries: AgendaEntry[];
  timedEntries: AgendaEntry[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeDate = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const addDays = (date: Date, amount: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const isSameDate = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isMidnight = (date: Date): boolean =>
  date.getHours() === 0 &&
  date.getMinutes() === 0 &&
  date.getSeconds() === 0 &&
  date.getMilliseconds() === 0;

interface AgendaEventRange {
  start: Date;
  end: Date;
  startDay: Date;
  effectiveEndDay: Date;
}

const agendaRangeCache = new WeakMap<Event, Map<string, AgendaEventRange>>();

const getEventRangeForAgenda = (
  event: Event,
  appTimeZone: string
): AgendaEventRange => {
  const tzKey = appTimeZone ?? '';
  let perEvent = agendaRangeCache.get(event);
  if (perEvent) {
    const cached = perEvent.get(tzKey);
    if (cached) return cached;
  }

  const start = temporalToVisualDate(event.start, appTimeZone);
  const end = event.end ? temporalToVisualDate(event.end, appTimeZone) : start;
  const startDay = normalizeDate(start);
  const endDay = normalizeDate(end);

  let effectiveEndDay = new Date(endDay);
  if (!event.allDay && !isSameDate(startDay, endDay) && isMidnight(end)) {
    effectiveEndDay = addDays(effectiveEndDay, -1);
  }

  if (effectiveEndDay < startDay) {
    effectiveEndDay = new Date(startDay);
  }

  const result: AgendaEventRange = {
    start,
    end,
    startDay,
    effectiveEndDay,
  };

  if (!perEvent) {
    perEvent = new Map();
    agendaRangeCache.set(event, perEvent);
  }
  perEvent.set(tzKey, result);
  return result;
};

const formatAgendaTitle = (
  start: Date,
  endExclusive: Date,
  locale: string
): string => {
  const endInclusive = addDays(endExclusive, -1);
  if (new Intl.Locale(locale).calendar === 'persian') {
    return formatDateRangeLabel(start, endInclusive, locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  const sameYear = start.getFullYear() === endInclusive.getFullYear();
  const sameMonth = sameYear && start.getMonth() === endInclusive.getMonth();

  if (sameMonth) {
    return `${start.toLocaleDateString(locale, { month: 'long' })} ${start.getDate()} - ${endInclusive.getDate()}, ${start.getFullYear()}`;
  }

  if (sameYear) {
    return `${start.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} - ${endInclusive.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}, ${start.getFullYear()}`;
  }

  return `${start.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })} - ${endInclusive.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

const formatAgendaTimeLabel = (
  event: Event,
  day: Date,
  appTimeZone: string,
  timeFormat: '12h' | '24h',
  range?: AgendaEventRange
): { timeLabel: string; renderAsBadge: boolean; sortMs: number } => {
  const { start, end, startDay, effectiveEndDay } =
    range ?? getEventRangeForAgenda(event, appTimeZone);
  const multiDay = effectiveEndDay.getTime() > startDay.getTime();

  if (event.allDay) {
    return {
      timeLabel: 'All day',
      renderAsBadge: true,
      sortMs: day.getTime() - DAY_MS,
    };
  }

  if (isTask(event)) {
    return {
      timeLabel: formatTime(start.getHours(), start.getMinutes(), timeFormat),
      renderAsBadge: false,
      sortMs: start.getTime(),
    };
  }

  if (!multiDay) {
    return {
      timeLabel: formatTimeRangeFormatted(
        start.getHours(),
        start.getMinutes(),
        end.getHours(),
        end.getMinutes(),
        timeFormat
      ),
      renderAsBadge: false,
      sortMs: start.getTime(),
    };
  }

  if (isSameDate(day, startDay)) {
    return {
      timeLabel: `Starts ${formatTime(start.getHours(), start.getMinutes(), timeFormat)}`,
      renderAsBadge: true,
      sortMs: start.getTime(),
    };
  }

  if (isSameDate(day, effectiveEndDay)) {
    return {
      timeLabel: `Ends ${formatTime(end.getHours(), end.getMinutes(), timeFormat)}`,
      renderAsBadge: false,
      sortMs: day.getTime(),
    };
  }

  return {
    timeLabel: 'All day',
    renderAsBadge: true,
    sortMs: day.getTime() - DAY_MS / 2,
  };
};

const renderAgendaTimeLabel = (label: string, timeFormat?: string) => {
  if (timeFormat !== '12h') {
    return label;
  }

  const parts = label.split(/(am|pm|AM|PM)/);
  return (
    <>
      {parts.map((part, index) => {
        if (part === 'am' || part === 'AM') {
          return (
            <span key={index} className='df-agenda-unit'>
              am
            </span>
          );
        }
        if (part === 'pm' || part === 'PM') {
          return (
            <span key={index} className='df-agenda-unit'>
              pm
            </span>
          );
        }
        return part;
      })}
    </>
  );
};

const getCoarseYearMonth = (
  val: unknown
): { year: number; month: number } | null => {
  if (!val) return null;
  if (
    typeof val === 'object' &&
    val !== null &&
    'year' in val &&
    'month' in val
  ) {
    const candidate = val as { year: unknown; month: unknown };
    if (
      typeof candidate.year === 'number' &&
      typeof candidate.month === 'number'
    ) {
      return { year: candidate.year, month: candidate.month };
    }
  }
  if (val instanceof Date) {
    return { year: val.getFullYear(), month: val.getMonth() + 1 };
  }
  if (typeof val === 'string' && val.length >= 7) {
    const y = Number.parseInt(val.slice(0, 4), 10);
    const m = Number.parseInt(val.slice(5, 7), 10);
    if (Number.isFinite(y) && Number.isFinite(m)) {
      return { year: y, month: m };
    }
  }
  return null;
};

const buildAgendaGroups = (
  app: ICalendarApp,
  events: Event[],
  startDate: Date,
  daysToShow: number,
  showEmptyDays: boolean,
  timeFormat: '12h' | '24h'
): AgendaDayGroup[] => {
  const registry = app.getCalendarRegistry();
  const appTimeZone = app.timeZone;
  const groups: AgendaDayGroup[] = [];

  const agendaStart = normalizeDate(startDate);
  const agendaEnd = addDays(agendaStart, daysToShow);

  const startYear = agendaStart.getFullYear();
  const startMonth = agendaStart.getMonth() + 1;
  const endYear = agendaEnd.getFullYear();
  const endMonth = agendaEnd.getMonth() + 1;
  const minYearMonth = startYear * 12 + (startMonth - 1);
  const maxYearMonth = endYear * 12 + (endMonth + 1);

  const candidateEvents: { event: Event; range: AgendaEventRange }[] = [];
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    const s = getCoarseYearMonth(event.start);
    const e = getCoarseYearMonth(event.end ?? event.start);
    if (s && e) {
      const sYM = s.year * 12 + s.month;
      const eYM = e.year * 12 + e.month;
      if (eYM < minYearMonth || sYM > maxYearMonth) {
        continue;
      }
    }

    const range = getEventRangeForAgenda(event, appTimeZone);
    if (range.startDay < agendaEnd && range.effectiveEndDay >= agendaStart) {
      candidateEvents.push({ event, range });
    }
  }

  for (let index = 0; index < daysToShow; index += 1) {
    const day = addDays(startDate, index);
    const dayStart = normalizeDate(day);
    const dayEnd = addDays(dayStart, 1);

    const entries = candidateEvents
      .filter(
        ({ range }) =>
          range.startDay < dayEnd && range.effectiveEndDay >= dayStart
      )
      .map(({ event, range }) => {
        const { startDay, effectiveEndDay } = range;
        const { timeLabel, renderAsBadge, sortMs } = formatAgendaTimeLabel(
          event,
          dayStart,
          appTimeZone,
          timeFormat,
          range
        );
        const calendarId = getPrimaryCalendarId(event);
        const isMultiDayAllDay =
          event.allDay === true &&
          effectiveEndDay.getTime() > startDay.getTime();

        return {
          event,
          timeLabel,
          sortMs,
          renderAsBadge,
          isAllDay: event.allDay === true,
          isMultiDayAllDay,
          continuesFromPreviousDay:
            isMultiDayAllDay && !isSameDate(dayStart, startDay),
          continuesToNextDay:
            isMultiDayAllDay && !isSameDate(dayStart, effectiveEndDay),
          color: getLineColor(calendarId, registry),
          backgroundColor: getEventBgColor(calendarId, registry),
          textColor: getEventTextColor(calendarId, registry),
        };
      });

    const allDayEntries = entries
      .filter(entry => entry.isAllDay)
      .toSorted((a, b) => {
        if (a.isMultiDayAllDay !== b.isMultiDayAllDay) {
          return a.isMultiDayAllDay ? -1 : 1;
        }

        const allDayPriority = compareAllDayDisplayPriority(
          a.event,
          b.event,
          app.state.allDaySortComparator
        );
        if (allDayPriority !== 0) {
          return allDayPriority;
        }

        return a.event.title.localeCompare(b.event.title);
      });

    const timedEntries = entries
      .filter(entry => !entry.isAllDay)
      .toSorted((a, b) => {
        if (a.renderAsBadge !== b.renderAsBadge) {
          return a.renderAsBadge ? -1 : 1;
        }

        if (a.sortMs !== b.sortMs) {
          return a.sortMs - b.sortMs;
        }

        return a.event.title.localeCompare(b.event.title);
      });

    if (showEmptyDays || allDayEntries.length > 0 || timedEntries.length > 0) {
      groups.push({ date: dayStart, allDayEntries, timedEntries });
    }
  }

  return groups;
};

const AgendaView = ({
  app,
  config,
  useEventDetailPanel,
  calendarRef,
  selectedEventId,
  detailPanelEventId,
  onEventSelect,
  onDetailPanelToggle,
}: AgendaViewProps & { calendarRef: RefObject<HTMLDivElement> }) => {
  const { locale, t } = useLocale();
  const { screenSize } = useResponsiveMonthConfig();
  const isMobile = screenSize !== 'desktop';
  const customRenderingStore = useContext(CustomRenderingContext);
  const currentDate = app.getCurrentDate();
  const events = app.getEvents();

  const daysToShow =
    Number.isFinite(config.daysToShow) && (config.daysToShow ?? 0) > 0
      ? Math.floor(config.daysToShow as number)
      : 14;
  const showEmptyDays = config.showEmptyDays !== false;
  const timeFormat = app.state.timeFormat ?? config.timeFormat ?? '24h';

  const rangeStart = useMemo(() => normalizeDate(currentDate), [currentDate]);
  const rangeEnd = useMemo(
    () => addDays(rangeStart, daysToShow),
    [daysToShow, rangeStart]
  );

  const groups = useMemo(
    () =>
      buildAgendaGroups(
        app,
        events,
        rangeStart,
        daysToShow,
        showEmptyDays,
        timeFormat
      ),
    [app, daysToShow, events, rangeStart, showEmptyDays, timeFormat]
  );

  const title = useMemo(
    () => formatAgendaTitle(rangeStart, rangeEnd, locale),
    [locale, rangeEnd, rangeStart]
  );
  const today = useMemo(() => getTodayInTimeZone(app.timeZone), [app.timeZone]);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const selectedEventElementRef = useRef<HTMLElement | null>(null);
  const [detailPanelPosition, setDetailPanelPosition] = useState<{
    top: number;
    left: number;
    eventHeight: number;
    eventMiddleY: number;
    isSunday?: boolean;
  } | null>(null);

  useEffect(
    () => () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!detailPanelEventId) {
      setDetailPanelPosition(null);
    }
  }, [detailPanelEventId]);

  useEffect(() => {
    if (!detailPanelEventId || !detailPanelPosition) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickedInsideEvent =
        selectedEventElementRef.current?.contains(target) ?? false;
      const clickedOnSameEvent =
        target.closest(
          `[data-event-id="${detailPanelEventId.split('::')[0]}"]`
        ) !== null;
      const clickedInsidePanel =
        detailPanelRef.current?.contains(target) ?? false;
      const clickedInsideDetailDialog = target.closest(
        '[data-event-detail-dialog]'
      );
      const clickedInsideRangePickerPopup = target.closest(
        '[data-range-picker-popup]'
      );
      const clickedInsideCalendarPickerDropdown = target.closest(
        '[data-calendar-picker-dropdown]'
      );

      if (
        !clickedInsideEvent &&
        !clickedOnSameEvent &&
        !clickedInsidePanel &&
        !clickedInsideDetailDialog &&
        !clickedInsideRangePickerPopup &&
        !clickedInsideCalendarPickerDropdown
      ) {
        setDetailPanelPosition(null);
        onDetailPanelToggle?.(null);
        onEventSelect?.(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [
    detailPanelEventId,
    detailPanelPosition,
    onDetailPanelToggle,
    onEventSelect,
  ]);

  const handleEventClick = useCallback(
    (event: Event, nativeEvent?: MouseEvent) => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }

      if (isMobile) {
        app.onEventClick(event, nativeEvent);
        onEventSelect?.(event.id);
        if (app.getReadOnlyConfig(event.id).viewable !== false) {
          onDetailPanelToggle?.(event.id);
        }
        return;
      }

      clickTimerRef.current = setTimeout(() => {
        app.onEventClick(event, nativeEvent);
        onEventSelect?.(event.id);
        if (
          app.getEventDetailEnabled() &&
          app.getEventDetailTrigger() === 'click' &&
          nativeEvent?.currentTarget &&
          useEventDetailPanel !== false
        ) {
          const target = nativeEvent.currentTarget as HTMLElement;
          const rect = target.getBoundingClientRect();
          const panelWidth = 320;
          const gap = 12;
          const viewportPadding = 16;
          const placeLeft =
            rect.right + gap + panelWidth > window.innerWidth - viewportPadding;
          selectedEventElementRef.current = target;
          setDetailPanelPosition({
            top: Math.min(
              Math.max(viewportPadding, rect.top + rect.height / 2 - 180),
              window.innerHeight - 380
            ),
            left: placeLeft
              ? Math.max(viewportPadding, rect.left - panelWidth - gap)
              : Math.min(
                  window.innerWidth - panelWidth - viewportPadding,
                  rect.right + gap
                ),
            eventHeight: rect.height,
            eventMiddleY: rect.top + rect.height / 2,
            isSunday: placeLeft,
          });
          onDetailPanelToggle?.(event.id);
        }
        clickTimerRef.current = null;
      }, 180);
    },
    [app, isMobile, onDetailPanelToggle, onEventSelect, useEventDetailPanel]
  );

  const handleEventDoubleClick = useCallback(
    (event: Event, nativeEvent: MouseEvent) => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      onEventSelect?.(null);
      selectedEventElementRef.current =
        nativeEvent.currentTarget as HTMLElement;
      Promise.resolve(app.onEventDoubleClick(event, nativeEvent))
        .then(result => {
          if (result === false) return;
          if (app.getReadOnlyConfig(event.id).viewable !== false) {
            const target = selectedEventElementRef.current;
            if (target && useEventDetailPanel !== false) {
              const rect = target.getBoundingClientRect();
              const panelWidth = 320;
              const gap = 12;
              const viewportPadding = 16;
              const viewportHeight = window.innerHeight;
              const viewportWidth = window.innerWidth;
              const placeLeft =
                rect.right + gap + panelWidth > viewportWidth - viewportPadding;
              const left = placeLeft
                ? Math.max(viewportPadding, rect.left - panelWidth - gap)
                : Math.min(
                    viewportWidth - panelWidth - viewportPadding,
                    rect.right + gap
                  );
              const top = Math.min(
                Math.max(viewportPadding, rect.top + rect.height / 2 - 180),
                viewportHeight - 380
              );

              setDetailPanelPosition({
                top,
                left,
                eventHeight: rect.height,
                eventMiddleY: rect.top + rect.height / 2,
                isSunday: placeLeft,
              });
            }
            onDetailPanelToggle?.(event.id);
          }
        })
        .catch(() => {
          if (app.getReadOnlyConfig(event.id).viewable !== false) {
            const target = selectedEventElementRef.current;
            if (target && useEventDetailPanel !== false) {
              const rect = target.getBoundingClientRect();
              const panelWidth = 320;
              const gap = 12;
              const viewportPadding = 16;
              const viewportHeight = window.innerHeight;
              const viewportWidth = window.innerWidth;
              const placeLeft =
                rect.right + gap + panelWidth > viewportWidth - viewportPadding;
              const left = placeLeft
                ? Math.max(viewportPadding, rect.left - panelWidth - gap)
                : Math.min(
                    viewportWidth - panelWidth - viewportPadding,
                    rect.right + gap
                  );
              const top = Math.min(
                Math.max(viewportPadding, rect.top + rect.height / 2 - 180),
                viewportHeight - 380
              );

              setDetailPanelPosition({
                top,
                left,
                eventHeight: rect.height,
                eventMiddleY: rect.top + rect.height / 2,
                isSunday: placeLeft,
              });
            }
            onDetailPanelToggle?.(event.id);
          }
        });
    },
    [app, onDetailPanelToggle, onEventSelect, useEventDetailPanel]
  );

  const handleGridDateClick = useCallback(
    (date: Date, dayEvents: Event[], e?: MouseEvent) => {
      const clickAction = config?.gridDateClick;
      if (!clickAction) return;

      if (typeof clickAction === 'function') {
        clickAction(date, dayEvents, e);
        return;
      }

      if (clickAction === 'day-view') {
        app.setCurrentDate(date);
        app.changeView('day');
      }
    },
    [app, config?.gridDateClick]
  );

  const handleGridDateDoubleClick = useCallback(
    (date: Date, dayEvents: Event[], e?: MouseEvent) => {
      const dblClickAction = config?.gridDateDoubleClick ?? 'day-view';

      if (typeof dblClickAction === 'function') {
        dblClickAction(date, dayEvents, e);
        return;
      }

      if (dblClickAction === 'day-view') {
        app.setCurrentDate(date);
        app.changeView('day');
      }
    },
    [app, config?.gridDateDoubleClick]
  );

  const renderAgendaTask = (entry: AgendaEntry) => (
    <>
      <TaskCheckbox
        event={entry.event}
        app={app}
        isEditable={app.canMutateFromUI(
          entry.event._recurrenceMasterId ?? entry.event.id
        )}
        color={entry.color}
      />
      <span className='df-agenda-title'>
        <TaskPriorityIndicator event={entry.event} />
        {entry.event.title}
      </span>
    </>
  );

  const renderAgendaEventButton = (entry: AgendaEntry) => (
    <button
      type='button'
      className='df-agenda-event'
      data-kind={entry.event.kind ?? 'event'}
      style={
        isTask(entry.event)
          ? {
              background: getTaskPriorityBackground(
                entry.event,
                selectedEventId === entry.event.id
              ),
              color: getTaskPriorityTextColor(
                entry.event,
                selectedEventId === entry.event.id
              ),
            }
          : undefined
      }
      data-task-completed={String(!!entry.event.task?.completed)}
      data-selected={selectedEventId === entry.event.id ? 'true' : 'false'}
      onClick={e => {
        e.stopPropagation();
        handleEventClick(entry.event, e as unknown as MouseEvent);
      }}
      onDblClick={e => {
        e.stopPropagation();
        handleEventDoubleClick(entry.event, e as unknown as MouseEvent);
      }}
    >
      {isTask(entry.event) ? (
        renderAgendaTask(entry)
      ) : entry.renderAsBadge ? (
        <span
          className='df-agenda-badge'
          data-continued-left={
            entry.continuesFromPreviousDay ? 'true' : 'false'
          }
          data-continued-right={entry.continuesToNextDay ? 'true' : 'false'}
          style={{
            backgroundColor: entry.backgroundColor,
            color: entry.textColor,
          }}
        >
          {entry.event.title}
        </span>
      ) : (
        <span
          className='df-agenda-dot'
          style={{ backgroundColor: entry.color }}
        />
      )}
      {!entry.renderAsBadge && !isTask(entry.event) && (
        <span className='df-agenda-title'>{entry.event.title}</span>
      )}
    </button>
  );

  const detailPanelEvent =
    detailPanelPosition && detailPanelEventId
      ? (events.find(event => event.id === detailPanelEventId.split('::')[0]) ??
        null)
      : null;

  const contentSlotRenderer = useCallback(
    (contentProps: {
      event: Event;
      isAllDay: boolean;
      onEventUpdate: (updatedEvent: Event) => void | Promise<void>;
      onEventDelete: (eventId: string) => void | Promise<void>;
      onClose?: () => void;
      app?: ICalendarApp;
    }) => (
      <ContentSlot
        store={customRenderingStore}
        generatorName='eventDetailContent'
        generatorArgs={contentProps}
      />
    ),
    [customRenderingStore]
  );

  return (
    <div className='df-agenda-view'>
      <ViewHeader
        calendar={app}
        viewType='month'
        navigationUnit='period'
        currentDate={rangeStart}
        customTitle={title}
        onPrevious={() => app.goToPrevious()}
        onNext={() => app.goToNext()}
        onToday={() => app.goToToday()}
      />

      <div className='df-agenda-scroll'>
        {groups.length === 0 ? (
          <div className='df-agenda-empty'>{t('noEventsInRange')}</div>
        ) : (
          groups.map(group => (
            <section
              key={group.date.toISOString()}
              className='df-agenda-day-section'
              data-today={isSameDate(group.date, today) ? 'true' : 'false'}
              onClick={() =>
                handleGridDateClick(group.date, [
                  ...group.allDayEntries.map(entry => entry.event),
                  ...group.timedEntries.map(entry => entry.event),
                ])
              }
              onDblClick={() =>
                handleGridDateDoubleClick(group.date, [
                  ...group.allDayEntries.map(entry => entry.event),
                  ...group.timedEntries.map(entry => entry.event),
                ])
              }
            >
              <div className='df-agenda-day-rail'>
                <div
                  className='df-agenda-day-number'
                  data-today={isSameDate(group.date, today) ? 'true' : 'false'}
                >
                  {group.date.toLocaleDateString(locale, { day: 'numeric' })}
                </div>
                <div className='df-agenda-day-meta'>
                  <div className='df-agenda-day-month'>
                    {formatDateLabel(group.date, locale, {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  <div className='df-agenda-day-name'>
                    {group.date.toLocaleDateString(locale, { weekday: 'long' })}
                  </div>
                </div>
              </div>

              <div className='df-agenda-day-content'>
                {group.allDayEntries.length === 0 &&
                group.timedEntries.length === 0 ? (
                  <div className='df-agenda-empty-row'>{t('noEvents')}</div>
                ) : (
                  <>
                    {group.allDayEntries.length > 0 && (
                      <div className='df-agenda-item df-agenda-item-all-day'>
                        <div className='df-agenda-time'>{t('allDay')}</div>
                        <div className='df-agenda-all-day-events'>
                          {group.allDayEntries.map(entry => (
                            <div
                              key={`${group.date.toISOString()}-${entry.event.id}`}
                              className='df-agenda-all-day-event'
                            >
                              {renderAgendaEventButton(entry)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {group.timedEntries.map(entry => (
                      <div
                        key={`${group.date.toISOString()}-${entry.event.id}`}
                        className='df-agenda-item'
                      >
                        <div className='df-agenda-time'>
                          {renderAgendaTimeLabel(entry.timeLabel, timeFormat)}
                        </div>
                        {renderAgendaEventButton(entry)}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </section>
          ))
        )}
      </div>

      {detailPanelEvent && useEventDetailPanel !== false && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
              pointerEvents: 'none',
            }}
          />
          <EventDetailPanel
            showDetailPanel={true}
            detailPanelPosition={detailPanelPosition}
            event={detailPanelEvent}
            detailPanelRef={detailPanelRef}
            isAllDay={detailPanelEvent.allDay === true}
            eventVisibility='standard'
            calendarRef={calendarRef}
            selectedEventElementRef={selectedEventElementRef}
            onEventUpdate={event => app.updateEvent(event.id, event)}
            onEventDelete={id => app.deleteEvent(id)}
            handlePanelClose={() => {
              setDetailPanelPosition(null);
              onDetailPanelToggle?.(null);
              onEventSelect?.(null);
            }}
            customRenderingStore={customRenderingStore}
            contentSlotRenderer={contentSlotRenderer}
            app={app}
          />
        </>
      )}
    </div>
  );
};

export default AgendaView;
