import { RefObject } from 'preact';
import {
  useMemo,
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
} from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import ViewHeader from '@/components/common/ViewHeader';
import { GridContextMenu } from '@/components/contextMenu';
import {
  getEventDayRange,
  groupDaysIntoRows,
} from '@/components/yearView/utils';
import { YearRowComponent } from '@/components/yearView/YearRowComponent';
import { useLocale } from '@/locale';
import { useDragForView } from '@/plugins/dragBridge';
import {
  monthViewContainer,
  scrollContainer,
  scrollbarHide,
} from '@/styles/classNames';
import {
  Event,
  ViewType,
  MonthEventDragState,
  ICalendarApp,
  YearViewConfig,
} from '@/types';
import { dateToPlainDate, dateToZonedDateTime, hasEventChanged } from '@/utils';

export interface YearViewProps {
  app: ICalendarApp;
  calendarRef: RefObject<HTMLDivElement>;
  useEventDetailPanel?: boolean;
  config?: YearViewConfig;
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string | null) => void;
  detailPanelEventId?: string | null;
  onDetailPanelToggle?: (eventId: string | null) => void;
}

export const DefaultYearView = ({
  app,
  calendarRef,
  useEventDetailPanel,
  config,
  selectedEventId: propSelectedEventId,
  onEventSelect: propOnEventSelect,
  detailPanelEventId: propDetailPanelEventId,
  onDetailPanelToggle: propOnDetailPanelToggle,
}: YearViewProps) => {
  const { t, locale } = useLocale();
  const currentDate = app.getCurrentDate();
  const currentYear = currentDate.getFullYear();
  const rawEvents = app.getEvents();
  const appTimeZone = app.timeZone;
  const scrollElementRef = useRef<HTMLDivElement>(null);
  // Stable bucket refs: reused when element refs are identical so YearRowComponent
  // memo comparator can bail out on rows whose events didn't change.
  const stableBucketsRef = useRef<Event[][]>([]);
  const MIN_YEAR_CELL_WIDTH = 80;

  const [columnsPerRow, setColumnsPerRow] = useState(7);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null
  );
  const [internalDetailPanelEventId, setInternalDetailPanelEventId] = useState<
    string | null
  >(null);

  const selectedEventId =
    propSelectedEventId === undefined
      ? internalSelectedId
      : propSelectedEventId;
  const detailPanelEventId =
    propDetailPanelEventId === undefined
      ? internalDetailPanelEventId
      : propDetailPanelEventId;

  const [newlyCreatedEventId, setNewlyCreatedEventId] = useState<string | null>(
    null
  );

  const setSelectedEventId = useCallback(
    (id: string | null) => {
      if (propOnEventSelect) {
        propOnEventSelect(id);
      } else {
        setInternalSelectedId(id);
      }
    },
    [propOnEventSelect]
  );

  const setDetailPanelEventId = useCallback(
    (id: string | null) => {
      if (propOnDetailPanelToggle) {
        propOnDetailPanelToggle(id);
      } else {
        setInternalDetailPanelEventId(id);
      }
    },
    [propOnDetailPanelToggle]
  );

  const handleDetailPanelOpen = useCallback(() => {
    setNewlyCreatedEventId(null);
  }, []);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    date: Date;
  } | null>(null);
  const isEditable = app.canMutateFromUI();

  const handleRowContextMenu = useCallback(
    (menu: { x: number; y: number; date: Date } | null) => {
      if (!isEditable) return;
      setContextMenu(menu);
    },
    [isEditable]
  );

  useEffect(() => {
    if (isEditable) return;
    setContextMenu(null);
  }, [isEditable]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (e.button === 2) return; // Ignore right clicks

      const target = e.target as HTMLElement;

      const clickedEvent = target.closest('[data-event-id]');
      const clickedPanel = target.closest('[data-event-detail-panel]');
      const clickedDialog = target.closest('[data-event-detail-dialog]');
      const clickedRangePicker = target.closest('[data-range-picker-popup]');
      const clickedCalendarPicker = target.closest(
        '[data-calendar-picker-dropdown]'
      );
      const clickedContextMenu = target.closest('.df-context-menu');

      if (
        !clickedEvent &&
        !clickedPanel &&
        !clickedDialog &&
        !clickedRangePicker &&
        !clickedCalendarPicker &&
        !clickedContextMenu
      ) {
        setSelectedEventId(null);
        setDetailPanelEventId(null);
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    const container = scrollElementRef.current;
    if (!container) return;

    const applyMeasuredLayout = (width: number) => {
      if (width <= 0) return;

      const cols = Math.max(1, Math.floor(width / MIN_YEAR_CELL_WIDTH));
      setColumnsPerRow(cols);
      setIsMobile(width < 768);
      setIsLayoutReady(true);
    };

    // Measure once immediately so first paint already uses the real container width.
    applyMeasuredLayout(container.clientWidth);

    const observer = new ResizeObserver(entries => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);

      resizeTimeoutRef.current = setTimeout(() => {
        const width = entries[0].contentRect.width;
        applyMeasuredLayout(width);
      }, 60);
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, []);

  // Sync highlighted event from app state
  const prevHighlightedEventId = useRef(app.state.highlightedEventId);

  useEffect(() => {
    if (app.state.highlightedEventId) {
      setSelectedEventId(app.state.highlightedEventId);

      requestAnimationFrame(() => {
        const container = scrollElementRef.current;
        if (!container) return;

        const el = container.querySelector(
          `[data-event-id="${app.state.highlightedEventId}"]`
        ) as HTMLElement | null;
        if (!el) return;

        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const targetTop =
          elRect.top -
          containerRect.top +
          container.scrollTop -
          container.clientHeight / 2 +
          elRect.height / 2;

        container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      });
    } else if (prevHighlightedEventId.current) {
      setSelectedEventId(null);
    }
    prevHighlightedEventId.current = app.state.highlightedEventId;
  }, [app.state.highlightedEventId]);

  // Drag and Drop Hook
  const {
    handleMoveStart,
    handleResizeStart,
    handleCreateStart,
    dragState,
    isDragging,
  } = useDragForView(app, {
    calendarRef,
    viewType: ViewType.YEAR,
    onEventsUpdate: (updateFunc, isResizing, source) => {
      const newEvents = updateFunc(rawEvents);

      // Build a Map for O(1) lookups — the previous O(N²) .find() in .filter()
      // caused ~100M string comparisons/tick with 10000 events.
      const prevMap = new Map(rawEvents.map(e => [e.id, e]));
      const eventsToUpdate = newEvents.filter(newEvent => {
        const old = prevMap.get(newEvent.id);
        return (
          old !== undefined &&
          old !== newEvent &&
          hasEventChanged(old, newEvent)
        );
      });

      if (eventsToUpdate.length > 0) {
        app.applyEventsChanges(
          {
            update: eventsToUpdate.map(e => ({ id: e.id, updates: e })),
          },
          isResizing,
          source
        );
      }
    },
    currentWeekStart: new Date(),
    events: rawEvents,
    onEventCreate: event => {
      app.addEvent(event);
    },
    onEventEdit: event => {
      setNewlyCreatedEventId(event.id);
    },
    isMobile,
  });
  const yearDragState = dragState as MonthEventDragState;

  // Get config value
  const showTimedEvents = config?.showTimedEventsInYearView ?? false;

  // Handle double click on cell - create all-day or timed event based on config
  const handleCellDoubleClick = useCallback(
    (e: unknown, date: Date) => {
      if (showTimedEvents) {
        // Use default drag behavior for timed events
        handleCreateStart?.(e, date);
      } else {
        // Create all-day event directly using Temporal.PlainDate
        const plainDate = Temporal.PlainDate.from({
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
        });
        const newEvent: Event = {
          id: `event-${Date.now()}`,
          title: t('newEvent') || 'New Event',
          start: plainDate,
          end: plainDate,
          allDay: true,
          calendarId:
            app.getCalendarRegistry().getDefaultCalendarId() || 'default',
        };
        app.addEvent(newEvent);
        setNewlyCreatedEventId(newEvent.id);
      }
    },
    [showTimedEvents, handleCreateStart, app, t]
  );

  // Generate all days for the current year
  const yearDays = useMemo(() => {
    const days: Date[] = [];
    const start = new Date(currentYear, 0, 1);
    const end = new Date(currentYear, 11, 31);

    for (
      let time = start.getTime();
      time <= end.getTime();
      time += 24 * 60 * 60 * 1000
    ) {
      days.push(new Date(time));
    }
    return days;
  }, [currentYear]);

  // Group days into rows
  const rows = useMemo(
    () => groupDaysIntoRows(yearDays, columnsPerRow),
    [yearDays, columnsPerRow]
  );

  // Filter events for the current year (uses per-event cache via getEventDayRange)
  const yearEvents = useMemo(() => {
    const yearStartMs = new Date(currentYear, 0, 1).getTime();
    const yearEndMs = new Date(currentYear, 11, 31, 23, 59, 59).getTime();

    const result: Event[] = [];
    for (let i = 0; i < rawEvents.length; i++) {
      const event = rawEvents[i];
      if (!event.start) continue;
      if (!showTimedEvents && !event.allDay) continue;
      const range = getEventDayRange(event, appTimeZone);
      if (range.startMs <= yearEndMs && range.endMsEod >= yearStartMs) {
        result.push(event);
      }
    }
    return result;
  }, [rawEvents, currentYear, showTimedEvents, appTimeZone]);

  // Bucket events into rows in a single O(N + R) pass instead of O(N x R).
  // Most events span 1-2 weeks; we walk forward through rows from the first
  // overlap and stop once the event's end is past the row.
  const eventsByRow = useMemo(() => {
    const rowBoundaries = rows.map(rowDays => {
      if (rowDays.length === 0) return null;
      const firstDay = rowDays[0];
      const lastDay = rowDays.at(-1);
      if (!firstDay || !lastDay) return null;
      return {
        rowStartMs: new Date(
          firstDay.getFullYear(),
          firstDay.getMonth(),
          firstDay.getDate()
        ).getTime(),
        rowEndMs: new Date(
          lastDay.getFullYear(),
          lastDay.getMonth(),
          lastDay.getDate(),
          23,
          59,
          59,
          999
        ).getTime(),
      };
    });

    const newBuckets: Event[][] = rows.map(() => []);

    for (let i = 0; i < yearEvents.length; i++) {
      const event = yearEvents[i];
      const range = getEventDayRange(event, appTimeZone);
      for (let r = 0; r < rowBoundaries.length; r++) {
        const b = rowBoundaries[r];
        if (!b) continue;
        if (range.startMs > b.rowEndMs) continue;
        if (range.endMsEod < b.rowStartMs) break;
        newBuckets[r].push(event);
      }
    }

    // Stabilize: reuse previous bucket array ref when element refs are identical.
    // This lets YearRowComponent's memo comparator (which checks events===) bail
    // out for rows whose events didn't change during drag.
    const prev = stableBucketsRef.current;
    const stable = newBuckets.map((bucket, i) => {
      const prevBucket = prev[i];
      if (
        prevBucket &&
        prevBucket.length === bucket.length &&
        bucket.every((e, j) => e === prevBucket[j])
      ) {
        return prevBucket;
      }
      return bucket;
    });
    stableBucketsRef.current = stable;
    return stable;
  }, [rows, yearEvents, appTimeZone]);

  const dragPreviewEvent = useMemo(() => {
    if (
      !isDragging ||
      !yearDragState.eventId ||
      !yearDragState.startDate ||
      !yearDragState.endDate ||
      (yearDragState.mode !== 'move' && yearDragState.mode !== 'resize')
    ) {
      return null;
    }

    const baseEvent = yearEvents.find(
      event => event.id === yearDragState.eventId
    );
    if (!baseEvent) return null;

    return {
      ...baseEvent,
      start: baseEvent.allDay
        ? dateToPlainDate(yearDragState.startDate)
        : dateToZonedDateTime(yearDragState.startDate, appTimeZone),
      end: baseEvent.allDay
        ? dateToPlainDate(yearDragState.endDate)
        : dateToZonedDateTime(yearDragState.endDate, appTimeZone),
    } as Event;
  }, [
    isDragging,
    yearDragState.eventId,
    yearDragState.startDate,
    yearDragState.endDate,
    yearDragState.mode,
    yearEvents,
    appTimeZone,
  ]);

  const getCustomTitle = () => {
    const isAsianLocale = locale.startsWith('zh') || locale.startsWith('ja');
    return isAsianLocale ? `${currentYear}年` : `${currentYear}`;
  };

  return (
    <div className={monthViewContainer} onContextMenu={e => e.preventDefault()}>
      <ViewHeader
        calendar={app}
        viewType={ViewType.YEAR}
        currentDate={currentDate}
        customTitle={getCustomTitle()}
        onPrevious={() => {
          const newDate = new Date(currentDate);
          newDate.setFullYear(newDate.getFullYear() - 1);
          app.setCurrentDate(newDate);
        }}
        onNext={() => {
          const newDate = new Date(currentDate);
          newDate.setFullYear(newDate.getFullYear() + 1);
          app.setCurrentDate(newDate);
        }}
        onToday={() => {
          app.goToToday();
        }}
      />

      <div
        ref={scrollElementRef}
        className={`df-year-default-scroll ${scrollContainer} ${scrollbarHide}`}
      >
        <div
          className='df-year-default-rows'
          style={{
            opacity: isLayoutReady ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          {rows.map((rowDays, index) => (
            <YearRowComponent
              key={index}
              rowDays={rowDays}
              events={eventsByRow[index]}
              columnsPerRow={columnsPerRow}
              app={app}
              calendarRef={calendarRef}
              locale={locale}
              isDragging={isDragging}
              dragState={yearDragState}
              dragPreviewEvent={dragPreviewEvent}
              onMoveStart={handleMoveStart}
              onResizeStart={handleResizeStart}
              onCreateStart={handleCellDoubleClick}
              selectedEventId={selectedEventId}
              onEventSelect={setSelectedEventId}
              onMoreEventsClick={app.onMoreEventsClick}
              newlyCreatedEventId={newlyCreatedEventId}
              onDetailPanelOpen={handleDetailPanelOpen}
              detailPanelEventId={detailPanelEventId}
              onDetailPanelToggle={setDetailPanelEventId}
              useEventDetailPanel={useEventDetailPanel}
              onContextMenu={handleRowContextMenu}
              appTimeZone={appTimeZone}
            />
          ))}
        </div>
      </div>
      {isEditable && contextMenu && (
        <GridContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          date={contextMenu.date}
          viewType={ViewType.YEAR}
          onClose={() => setContextMenu(null)}
          app={app}
          onCreateEvent={() => {
            if (contextMenu && contextMenu.date) {
              const syntheticEvent = {
                preventDefault: () => {
                  /* noop */
                },
                stopPropagation: () => {
                  /* noop */
                },
                clientX: contextMenu.x,
                clientY: contextMenu.y,
              } as unknown;
              handleCellDoubleClick(syntheticEvent, contextMenu.date);
            }
          }}
        />
      )}
    </div>
  );
};
