import {
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
} from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';
import { useLocale } from '@/locale';
import {
  Event,
  ViewType,
  MonthEventDragState,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ICalendarApp,
} from '@/types';
import { temporalToDate } from '@/utils/temporal';
import ViewHeader from '@/components/common/ViewHeader';
import { useDragForView } from '@/plugins/dragPlugin';
import {
  monthViewContainer,
  scrollContainer,
  scrollbarHide,
} from '@/styles/classNames';
import { groupDaysIntoRows } from '@/components/yearView/utils';
import { YearRowComponent } from '@/components/yearView/YearRowComponent';

export interface YearViewProps {
  app: ICalendarApp;
  calendarRef: any;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  //TOOD: eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any;
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
    propSelectedEventId !== undefined
      ? propSelectedEventId
      : internalSelectedId;
  const detailPanelEventId =
    propDetailPanelEventId !== undefined
      ? propDetailPanelEventId
      : internalDetailPanelEventId;

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      const clickedEvent = target.closest('[data-event-id]');
      const clickedPanel = target.closest('[data-event-detail-panel]');

      if (!clickedEvent && !clickedPanel) {
        setSelectedEventId(null);
        setDetailPanelEventId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const container = scrollElementRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      const minCellWidth = 80; // Consistent with previous minmax
      const cols = Math.floor(width / minCellWidth);
      setColumnsPerRow(Math.max(1, cols));
      setIsLayoutReady(true);
    });

    observer.observe(container);
    return () => observer.disconnect();
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
    (e: any | any, date: Date) => {
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
    [showTimedEvents, handleCreateStart, app]
  );

  // Generate all days for the current year
  const yearDays = useMemo(() => {
    const days: Date[] = [];
    const start = new Date(currentYear, 0, 1);
    const end = new Date(currentYear, 11, 31);

    const current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [currentYear]);

  // Group days into rows
  const rows = useMemo(() => {
    return groupDaysIntoRows(yearDays, columnsPerRow);
  }, [yearDays, columnsPerRow]);

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
          className="w-full flex flex-col border-t border-l border-gray-100 dark:border-gray-800"
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
            />
          ))}
        </div>
      </div>
    </div>
  );
};
