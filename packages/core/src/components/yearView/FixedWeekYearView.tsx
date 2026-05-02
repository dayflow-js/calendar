import { RefObject, JSX } from 'preact';
import {
  useMemo,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import ViewHeader from '@/components/common/ViewHeader';
import { GridContextMenu } from '@/components/contextMenu';
import { useLocale } from '@/locale';
import { useDragForView } from '@/plugins/dragBridge';
import {
  Event,
  MonthEventDragState,
  ViewType,
  ICalendarApp,
  YearViewConfig,
} from '@/types';
import { hasEventChanged, scrollbarTakesSpace } from '@/utils';

import { FixedWeekMonthRow } from './FixedWeekMonthRow';
import {
  buildEffectiveFixedWeekMonthsData,
  buildFixedWeekMonthsData,
  createFixedWeekDragPreviewEvent,
  FixedWeekMonthData,
  getEventDayRange,
  getFixedWeekLabels,
  getFixedWeekTotalColumns,
} from './utils';

interface FixedWeekYearViewProps {
  app: ICalendarApp;
  calendarRef: RefObject<HTMLDivElement>;
  useEventDetailPanel?: boolean;
  config?: YearViewConfig;
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string | null) => void;
  detailPanelEventId?: string | null;
  onDetailPanelToggle?: (eventId: string | null) => void;
}

export const FixedWeekYearView = ({
  app,
  calendarRef,
  useEventDetailPanel,
  config,
  selectedEventId: propSelectedEventId,
  onEventSelect: propOnEventSelect,
  detailPanelEventId: propDetailPanelEventId,
  onDetailPanelToggle: propOnDetailPanelToggle,
}: FixedWeekYearViewProps) => {
  const { t, locale, getWeekDaysLabels } = useLocale();
  const currentDate = app.getCurrentDate();
  const currentYear = currentDate.getFullYear();
  const rawEvents = app.getEvents();
  const appTimeZone = app.timeZone;
  const startOfWeek = config?.startOfWeek ?? 1;

  // Refs for synchronized scrolling
  const weekLabelsRef = useRef<HTMLDivElement>(null);
  const monthLabelsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // State for scrollbar dimensions (to sync padding)
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const [scrollbarHeight, setScrollbarHeight] = useState(0);

  // State for event selection and detail panel
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null
  );
  const [internalDetailPanelEventId, setInternalDetailPanelEventId] = useState<
    string | null
  >(null);

  const hasScrollbarSpace = useMemo(() => scrollbarTakesSpace(), []);

  const selectedEventId =
    propSelectedEventId === undefined
      ? internalSelectedId
      : propSelectedEventId;
  const detailPanelEventId =
    propDetailPanelEventId === undefined
      ? internalDetailPanelEventId
      : propDetailPanelEventId;

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

  const [newlyCreatedEventId, setNewlyCreatedEventId] = useState<string | null>(
    null
  );

  const handleDetailPanelOpen = useCallback(
    () => setNewlyCreatedEventId(null),
    []
  );

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    date: Date;
  } | null>(null);
  const isEditable = app.canMutateFromUI();

  const handleContextMenu = useCallback(
    (e: MouseEvent, date: Date) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isEditable) return;
      setContextMenu({ x: e.clientX, y: e.clientY, date });
    },
    [isEditable]
  );

  useEffect(() => {
    if (isEditable) return;
    setContextMenu(null);
  }, [isEditable]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickedEvent = target.closest('[data-event-id]');
      const clickedPanel = target.closest('[data-event-detail-panel]');
      const clickedDialog = target.closest('[data-event-detail-dialog]');
      const clickedRangePicker = target.closest('[data-range-picker-popup]');
      const clickedCalendarPicker = target.closest(
        '[data-calendar-picker-dropdown]'
      );

      if (
        !clickedEvent &&
        !clickedPanel &&
        !clickedDialog &&
        !clickedRangePicker &&
        !clickedCalendarPicker
      ) {
        setSelectedEventId(null);
        setDetailPanelEventId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync highlighted event from app state — scroll to it and select it
  const prevHighlightedEventId = useRef(app.state.highlightedEventId);

  const measureScrollbars = useCallback(() => {
    if (contentRef.current) {
      const el = contentRef.current;
      const hScrollbar = el.offsetHeight - el.clientHeight;
      const vScrollbar = el.offsetWidth - el.clientWidth;

      setScrollbarHeight(prev => (prev === hScrollbar ? prev : hScrollbar));
      setScrollbarWidth(prev => (prev === vScrollbar ? prev : vScrollbar));
    }
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    measureScrollbars();
    const observer = new ResizeObserver(() => {
      measureScrollbars();
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [measureScrollbars]);

  useEffect(() => {
    if (app.state.highlightedEventId) {
      setSelectedEventId(app.state.highlightedEventId);

      requestAnimationFrame(() => {
        const container = contentRef.current;
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
        const targetLeft =
          elRect.left -
          containerRect.left +
          container.scrollLeft -
          container.clientWidth / 2 +
          elRect.width / 2;

        container.scrollTo({
          top: Math.max(0, targetTop),
          left: Math.max(0, targetLeft),
          behavior: 'smooth',
        });
      });
    } else if (prevHighlightedEventId.current) {
      setSelectedEventId(null);
    }
    prevHighlightedEventId.current = app.state.highlightedEventId;
  }, [app.state.highlightedEventId]);

  // Calculate the maximum number of columns required for the current year
  const totalColumns = useMemo(
    () => getFixedWeekTotalColumns(currentYear, startOfWeek),
    [currentYear, startOfWeek]
  );

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
        };
        app.addEvent(newEvent);
        setNewlyCreatedEventId(newEvent.id);
      }
    },
    [showTimedEvents, handleCreateStart, app, t]
  );

  // Generate week header labels
  const weekLabels = useMemo(
    () =>
      getFixedWeekLabels({
        locale,
        totalColumns,
        startOfWeek,
        getWeekDaysLabels,
      }),
    [locale, totalColumns, startOfWeek, getWeekDaysLabels]
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

  // Generate data for all 12 months with event segments
  const monthsData = useMemo<FixedWeekMonthData[]>(
    () =>
      buildFixedWeekMonthsData({
        currentYear,
        locale,
        totalColumns,
        yearEvents,
        startOfWeek,
        appTimeZone,
      }),
    [currentYear, locale, totalColumns, yearEvents, startOfWeek, appTimeZone]
  );

  const dragPreviewEvent = useMemo(
    () =>
      createFixedWeekDragPreviewEvent({
        isDragging,
        dragState: yearDragState,
        yearEvents,
        appTimeZone,
      }),
    [isDragging, yearDragState, yearEvents, appTimeZone]
  );

  const isMovePreviewActive =
    isDragging &&
    yearDragState.mode === 'move' &&
    !!dragPreviewEvent &&
    dragPreviewEvent.id === yearDragState.eventId;

  const effectiveMonthsData = useMemo(
    () =>
      buildEffectiveFixedWeekMonthsData({
        monthsData,
        dragPreviewEvent,
        isMovePreviewActive,
        currentYear,
        startOfWeek,
        appTimeZone,
      }),
    [
      monthsData,
      dragPreviewEvent,
      isMovePreviewActive,
      currentYear,
      startOfWeek,
      appTimeZone,
    ]
  );

  const monthHeightSignature = useMemo(
    () => effectiveMonthsData.map(month => month.minHeight).join(','),
    [effectiveMonthsData]
  );

  useEffect(() => {
    measureScrollbars();
  }, [measureScrollbars, monthHeightSignature]);

  // Handle scroll synchronization
  const handleContentScroll = useCallback(
    (e: JSX.TargetedEvent<HTMLDivElement, globalThis.Event>) => {
      const target = e.currentTarget;
      if (weekLabelsRef.current) {
        weekLabelsRef.current.scrollLeft = target.scrollLeft;
      }
      if (monthLabelsRef.current) {
        monthLabelsRef.current.scrollTop = target.scrollTop;
      }
    },
    []
  );

  const getCustomTitle = () => {
    const isAsianLocale = locale.startsWith('zh') || locale.startsWith('ja');
    return isAsianLocale ? `${currentYear}年` : `${currentYear}`;
  };

  return (
    <div className='df-year-fixed' onContextMenu={e => e.preventDefault()}>
      {/* Year Header */}
      <div className='df-year-fixed-header-span'>
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
      </div>

      {/* Corner - Fixed */}
      <div className='df-year-fixed-corner' />

      {/* Week Labels Header */}
      <div ref={weekLabelsRef} className='df-year-fixed-week-header'>
        <div
          className='df-year-fixed-week-header-inner'
          style={{ minWidth: `calc(1352px + ${scrollbarWidth}px)` }}
        >
          <div
            className='df-year-fixed-week-grid'
            style={{
              gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))`,
              minWidth: '1352px',
            }}
          >
            {weekLabels.map((label, i) => {
              const dayOfWeek = (i + startOfWeek) % 7;
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              return (
                <div
                  key={`label-${i}`}
                  className='df-year-fixed-week-label'
                  data-weekend={isWeekend ? 'true' : 'false'}
                >
                  {label}
                </div>
              );
            })}
          </div>
          {/* Spacer to compensate for vertical scrollbar in content area */}
          {scrollbarWidth > 0 && (
            <div
              className='df-year-fixed-week-spacer'
              data-scrollbar-space={hasScrollbarSpace ? 'true' : 'false'}
              style={{ width: `${scrollbarWidth}px` }}
            />
          )}
        </div>
      </div>

      {/* Month Labels Sidebar */}
      <div ref={monthLabelsRef} className='df-year-fixed-month-sidebar'>
        <div className='df-year-fixed-month-sidebar-inner'>
          {effectiveMonthsData.map(month => (
            <div
              key={month.monthIndex}
              className='df-year-fixed-month-label'
              style={{
                minHeight: `${month.minHeight}px`,
                transition: 'min-height 180ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {month.monthName}
            </div>
          ))}
          {/* Spacer to compensate for horizontal scrollbar in content area */}
          {scrollbarHeight > 0 && (
            <div
              className='df-year-fixed-month-spacer'
              data-scrollbar-space={hasScrollbarSpace ? 'true' : 'false'}
              style={{ height: `${scrollbarHeight}px` }}
            />
          )}
        </div>
      </div>

      {/* Days Grid Content - Scrollable */}
      <div
        ref={contentRef}
        className='df-year-fixed-content'
        onScroll={handleContentScroll}
      >
        <div
          className='df-year-fixed-content-inner'
          style={{ minWidth: '1352px' }}
        >
          {effectiveMonthsData.map(monthData => (
            <FixedWeekMonthRow
              key={monthData.monthIndex}
              monthData={monthData}
              currentYear={currentYear}
              startOfWeek={startOfWeek}
              totalColumns={totalColumns}
              app={app}
              calendarRef={calendarRef}
              isDragging={isDragging}
              dragState={yearDragState}
              dragPreviewEvent={dragPreviewEvent}
              selectedEventId={selectedEventId}
              onMoveStart={handleMoveStart}
              onResizeStart={handleResizeStart}
              onCreateStart={handleCellDoubleClick}
              onEventSelect={setSelectedEventId}
              newlyCreatedEventId={newlyCreatedEventId}
              onDetailPanelOpen={handleDetailPanelOpen}
              detailPanelEventId={detailPanelEventId}
              onDetailPanelToggle={setDetailPanelEventId}
              useEventDetailPanel={useEventDetailPanel}
              onContextMenu={handleContextMenu}
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
          }}
        />
      )}
    </div>
  );
};
