import { RefObject } from 'preact';
import {
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
} from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import ViewHeader from '@/components/common/ViewHeader';
import { GridContextMenu } from '@/components/contextMenu';
import { groupDaysIntoRows } from '@/components/yearView/utils';
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
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ICalendarApp,
  YearViewConfig,
} from '@/types';
import { temporalToDate } from '@/utils/temporal';

export interface YearViewProps {
  app: ICalendarApp;
  calendarRef: RefObject<HTMLDivElement>;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  config?: YearViewConfig;
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string | null) => void;
  detailPanelEventId?: string | null;
  onDetailPanelToggle?: (eventId: string | null) => void;
}

export const DefaultYearView = ({
  app,
  calendarRef,
  customDetailPanelContent,
  customEventDetailDialog,
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
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const [columnsPerRow, setColumnsPerRow] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.max(1, Math.floor(window.innerWidth / 80));
    }
    return 7;
  });
  const [isLayoutReady, setIsLayoutReady] = useState(false);

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

  const setSelectedEventId = (id: string | null) => {
    if (propOnEventSelect) {
      propOnEventSelect(id);
    } else {
      setInternalSelectedId(id);
    }
  };

  const setDetailPanelEventId = (id: string | null) => {
    if (propOnDetailPanelToggle) {
      propOnDetailPanelToggle(id);
    } else {
      setInternalDetailPanelEventId(id);
    }
  };

  const [newlyCreatedEventId, setNewlyCreatedEventId] = useState<string | null>(
    null
  );

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    date: Date;
  } | null>(null);

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

  useEffect(() => {
    const container = scrollElementRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);

      resizeTimeoutRef.current = setTimeout(() => {
        const width = entries[0].contentRect.width;
        const minCellWidth = 80; // Consistent with previous minmax
        const cols = Math.floor(width / minCellWidth);
        setColumnsPerRow(Math.max(1, cols));
        setIsLayoutReady(true);
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
    onEventsUpdate: (updateFunc, isResizing) => {
      const newEvents = updateFunc(rawEvents);
      newEvents.forEach(newEvent => {
        const oldEvent = rawEvents.find(e => e.id === newEvent.id);
        if (
          oldEvent &&
          (oldEvent.start !== newEvent.start || oldEvent.end !== newEvent.end)
        ) {
          app.updateEvent(newEvent.id, newEvent, isResizing);
        }
      });
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

  // Filter events for the current year
  const yearEvents = useMemo(() => {
    // Simple filter: Event must overlap with the current year
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    return rawEvents.filter(event => {
      if (!event.start) return false;
      // If showTimedEvents is false, only show all-day events
      if (!showTimedEvents && !event.allDay) return false;
      const s = temporalToDate(event.start);
      const e = event.end ? temporalToDate(event.end) : s;
      return s <= yearEnd && e >= yearStart;
    });
  }, [rawEvents, currentYear, showTimedEvents]);

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
        className={`${scrollContainer} ${scrollbarHide}`}
        style={{
          overflow: 'hidden auto',
        }}
      >
        <div
          className='w-full flex flex-col border-t border-l border-gray-100 dark:border-gray-800'
          style={{
            opacity: isLayoutReady ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          {rows.map((rowDays, index) => (
            <YearRowComponent
              key={index}
              rowDays={rowDays}
              events={yearEvents}
              columnsPerRow={columnsPerRow}
              app={app}
              calendarRef={calendarRef}
              locale={locale}
              isDragging={isDragging}
              dragState={dragState as MonthEventDragState}
              onMoveStart={handleMoveStart}
              onResizeStart={handleResizeStart}
              onCreateStart={handleCellDoubleClick}
              selectedEventId={selectedEventId}
              onEventSelect={setSelectedEventId}
              onMoreEventsClick={app.onMoreEventsClick}
              newlyCreatedEventId={newlyCreatedEventId}
              onDetailPanelOpen={() => setNewlyCreatedEventId(null)}
              detailPanelEventId={detailPanelEventId}
              onDetailPanelToggle={setDetailPanelEventId}
              customDetailPanelContent={customDetailPanelContent}
              customEventDetailDialog={customEventDetailDialog}
              onContextMenu={setContextMenu}
            />
          ))}
        </div>
      </div>
      {contextMenu && (
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
