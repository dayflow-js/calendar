import { RefObject, JSX } from 'preact';
import {
  useMemo,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import { CalendarEvent } from '@/components/calendarEvent';
import ViewHeader from '@/components/common/ViewHeader';
import { GridContextMenu } from '@/components/contextMenu';
import { useLocale } from '@/locale';
import { useDragForView } from '@/plugins/dragBridge';
import { scrollbarHide } from '@/styles/classNames';
import {
  Event,
  MonthEventDragState,
  ViewType,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ICalendarApp,
  YearViewConfig,
} from '@/types';
import {
  getTodayInTimeZone,
  hasEventChanged,
  scrollbarTakesSpace,
  temporalToVisualDate,
} from '@/utils';

import {
  buildEffectiveFixedWeekMonthsData,
  buildFixedWeekMonthsData,
  createFixedWeekDragPreviewEvent,
  createPreviewMonthSegment,
  FixedWeekMonthData,
  getFixedWeekLabels,
  getFixedWeekTotalColumns,
} from './utils';

interface FixedWeekYearViewProps {
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

export const FixedWeekYearView = ({
  app,
  calendarRef,
  customDetailPanelContent,
  customEventDetailDialog,
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
  const today = getTodayInTimeZone(appTimeZone);
  today.setHours(0, 0, 0, 0);
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
  const isEditable = app.canMutateFromUI();

  const handleContextMenu = (e: MouseEvent, date: Date) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isEditable) return;
    setContextMenu({ x: e.clientX, y: e.clientY, date });
  };

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

      // Find events that need to be updated
      const eventsToUpdate = newEvents.filter(newEvent => {
        const oldEvent = rawEvents.find(e => e.id === newEvent.id);
        return oldEvent && hasEventChanged(oldEvent, newEvent);
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

  // Helper to check if a date is today
  const isDateToday = (date: Date) => date.getTime() === today.getTime();

  // Filter events for the current year
  const yearEvents = useMemo(() => {
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    return rawEvents.filter(event => {
      if (!event.start) return false;
      // If showTimedEvents is false, only show all-day events
      if (!showTimedEvents && !event.allDay) return false;
      const s = temporalToVisualDate(event.start, appTimeZone);
      const e = event.end ? temporalToVisualDate(event.end, appTimeZone) : s;
      return s <= yearEnd && e >= yearStart;
    });
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

  // Measure scrollbar dimensions to sync the sidebar/header padding
  useEffect(() => {
    const measureScrollbars = () => {
      if (contentRef.current) {
        const el = contentRef.current;
        // Horizontal scrollbar height = offsetHeight - clientHeight
        const hScrollbar = el.offsetHeight - el.clientHeight;
        // Vertical scrollbar width = offsetWidth - clientWidth
        const vScrollbar = el.offsetWidth - el.clientWidth;

        setScrollbarHeight(prev => (prev === hScrollbar ? prev : hScrollbar));
        setScrollbarWidth(prev => (prev === vScrollbar ? prev : vScrollbar));
      }
    };

    const el = contentRef.current;
    if (!el) return;
    // Initial measure
    measureScrollbars();
    const observer = new ResizeObserver(() => {
      measureScrollbars();
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [effectiveMonthsData]); // Re-measure when content changes

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
          {effectiveMonthsData.map(effectiveMonthData => {
            const dragPreviewSegment =
              isMovePreviewActive && dragPreviewEvent
                ? createPreviewMonthSegment(
                    dragPreviewEvent,
                    effectiveMonthData.monthIndex,
                    currentYear,
                    startOfWeek,
                    appTimeZone
                  )
                : null;
            const renderedSegments =
              isMovePreviewActive && yearDragState.eventId
                ? [
                    ...effectiveMonthData.eventSegments.filter(
                      segment => segment.event.id !== yearDragState.eventId
                    ),
                    ...(dragPreviewSegment ? [dragPreviewSegment] : []),
                  ]
                : effectiveMonthData.eventSegments;
            return (
              <div
                key={effectiveMonthData.monthIndex}
                className='df-year-fixed-month-row'
                style={{
                  minHeight: `${effectiveMonthData.minHeight}px`,
                  transition: 'min-height 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {/* Background grid cells */}
                <div
                  className='df-year-fixed-background-grid'
                  style={{
                    gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))`,
                  }}
                >
                  {effectiveMonthData.days.map((date, dayIndex) => {
                    const dayOfWeek = (dayIndex + startOfWeek) % 7;
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                    if (!date) {
                      return (
                        <div
                          key={`empty-${effectiveMonthData.monthIndex}-${dayIndex}`}
                          className='df-year-fixed-empty-cell'
                          data-weekend={isWeekend ? 'true' : 'false'}
                        />
                      );
                    }

                    const isToday = isDateToday(date);

                    // Format date for data attribute (YYYY-MM-DD)
                    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

                    return (
                      <div
                        key={date.getTime()}
                        data-date={dateString}
                        className='df-year-fixed-day-cell'
                        data-dragging={isDragging ? 'true' : 'false'}
                        data-weekend={isWeekend ? 'true' : 'false'}
                        onClick={() => app.selectDate(date)}
                        onDblClick={e => handleCellDoubleClick(e, date)}
                        onContextMenu={e => handleContextMenu(e, date)}
                      >
                        <span
                          className='df-year-fixed-day-number'
                          data-today={isToday ? 'true' : 'false'}
                        >
                          {date.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Event segments overlay */}
                {renderedSegments.length > 0 && (
                  <div
                    className='df-year-fixed-event-layer'
                    style={{ top: 20 }}
                  >
                    <div className='df-year-fixed-event-layer-inner'>
                      {renderedSegments.map(segment => (
                        <div
                          key={segment.id}
                          className='df-year-fixed-event-hitbox'
                        >
                          <CalendarEvent
                            event={segment.event}
                            isAllDay={!!segment.event.allDay}
                            viewType={ViewType.YEAR}
                            yearSegment={segment}
                            columnsPerRow={totalColumns}
                            isBeingDragged={
                              isDragging &&
                              yearDragState.eventId === segment.event.id
                            }
                            selectedEventId={selectedEventId}
                            onMoveStart={handleMoveStart}
                            onResizeStart={handleResizeStart}
                            onEventSelect={setSelectedEventId}
                            onDetailPanelToggle={setDetailPanelEventId}
                            newlyCreatedEventId={newlyCreatedEventId}
                            onDetailPanelOpen={() =>
                              setNewlyCreatedEventId(null)
                            }
                            calendarRef={calendarRef}
                            app={app}
                            detailPanelEventId={detailPanelEventId}
                            customDetailPanelContent={customDetailPanelContent}
                            customEventDetailDialog={customEventDetailDialog}
                            firstHour={0}
                            hourHeight={0}
                            onEventUpdate={updated =>
                              app.updateEvent(updated.id, updated)
                            }
                            onEventDelete={id => app.deleteEvent(id)}
                            appTimeZone={appTimeZone}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
