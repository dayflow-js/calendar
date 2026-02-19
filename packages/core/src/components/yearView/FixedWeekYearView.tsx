import {
  useMemo,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';
import { useLocale } from '@/locale';
import {
  Event,
  ViewType,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ICalendarApp,
} from '@/types';
import { temporalToDate } from '@/utils/temporal';
import { useDragForView } from '@/plugins/dragPlugin';
import ViewHeader from '@/components/common/ViewHeader';
import { YearMultiDayEvent } from './YearMultiDayEvent';
import { YearMultiDaySegment } from './utils';
import { GridContextMenu } from '@/components/contextMenu';
import { scrollbarHide } from '@/styles/classNames';

interface FixedWeekYearViewProps {
  app: ICalendarApp;
  calendarRef: any;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  config?: {
    showTimedEventsInYearView?: boolean;
  };
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string | null) => void;
  detailPanelEventId?: string | null;
  onDetailPanelToggle?: (eventId: string | null) => void;
}

interface MonthEventSegment extends YearMultiDaySegment {
  monthIndex: number;
}

// Event layout constants
const EVENT_ROW_SPACING = 18;
const DATE_HEADER_HEIGHT = 20;
const MIN_ROW_HEIGHT = 60; // 12 months × 60px = 720px, fits well in typical containers

/**
 * Analyze events for a specific month in the fixed-week layout.
 * Returns segments with column indices based on the month's padding and days.
 */
function analyzeEventsForMonth(
  events: Event[],
  monthIndex: number,
  year: number
): { segments: MonthEventSegment[]; maxVisualRow: number } {
  const monthStart = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const paddingStart = monthStart.getDay(); // 0 (Sun) to 6 (Sat)

  const monthStartMs = monthStart.getTime();
  const monthEnd = new Date(year, monthIndex, daysInMonth, 23, 59, 59, 999);
  const monthEndMs = monthEnd.getTime();

  // Filter events that overlap with this month
  const monthEvents = events.filter(event => {
    if (!event.start) return false;
    const eventStart = temporalToDate(event.start);
    const eventEnd = event.end ? temporalToDate(event.end) : eventStart;

    const eventStartMs = new Date(
      eventStart.getFullYear(),
      eventStart.getMonth(),
      eventStart.getDate()
    ).getTime();
    const eventEndMs = new Date(
      eventEnd.getFullYear(),
      eventEnd.getMonth(),
      eventEnd.getDate()
    ).getTime();

    return eventStartMs <= monthEndMs && eventEndMs >= monthStartMs;
  });

  // Sort events by length (longer first) then start time
  monthEvents.sort((a, b) => {
    const aStart = temporalToDate(a.start!).getTime();
    const aEnd = a.end ? temporalToDate(a.end).getTime() : aStart;
    const bStart = temporalToDate(b.start!).getTime();
    const bEnd = b.end ? temporalToDate(b.end).getTime() : bStart;

    const durationA = aEnd - aStart;
    const durationB = bEnd - bStart;

    if (durationA !== durationB) return durationB - durationA;
    return aStart - bStart;
  });

  const segments: MonthEventSegment[] = [];
  const occupiedSlots: boolean[][] = [];

  monthEvents.forEach(event => {
    const eventStart = temporalToDate(event.start!);
    const eventEnd = event.end ? temporalToDate(event.end) : eventStart;

    // Clamp to month boundaries
    const clampedStart = new Date(Math.max(eventStart.getTime(), monthStartMs));
    const clampedEnd = new Date(Math.min(eventEnd.getTime(), monthEndMs));

    // Calculate column indices
    // Day 1 of month is at column = paddingStart
    // Day N of month is at column = paddingStart + (N - 1)
    const startDay = clampedStart.getDate();
    const endDay = clampedEnd.getDate();

    const startCellIndex = paddingStart + (startDay - 1);
    const endCellIndex = paddingStart + (endDay - 1);

    // Determine if it's the first/last segment of the entire event
    const isFirstSegment =
      eventStart.getMonth() === monthIndex && eventStart.getFullYear() === year;
    const isLastSegment =
      eventEnd.getMonth() === monthIndex && eventEnd.getFullYear() === year;

    // Find visual row index (vertical slot)
    let visualRowIndex = 0;
    while (true) {
      let overlap = false;
      if (!occupiedSlots[visualRowIndex]) {
        occupiedSlots[visualRowIndex] = [];
      }

      for (let i = startCellIndex; i <= endCellIndex; i++) {
        if (occupiedSlots[visualRowIndex][i]) {
          overlap = true;
          break;
        }
      }

      if (!overlap) {
        for (let i = startCellIndex; i <= endCellIndex; i++) {
          occupiedSlots[visualRowIndex][i] = true;
        }
        break;
      }
      visualRowIndex++;
    }

    segments.push({
      id: `${event.id}_month_${monthIndex}`,
      event,
      startCellIndex,
      endCellIndex,
      isFirstSegment,
      isLastSegment,
      visualRowIndex,
      monthIndex,
    });
  });

  // Calculate max visual row index
  const maxVisualRow =
    segments.length > 0 ? Math.max(...segments.map(s => s.visualRowIndex)) : -1;

  return { segments, maxVisualRow };
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    date: Date;
  } | null>(null);

  const handleContextMenu = (e: any, date: Date) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, date });
  };

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

  // Calculate the maximum number of columns required for the current year
  const totalColumns = useMemo(() => {
    let maxSlots = 0;
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(currentYear, month, 1);
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      const startDay = monthStart.getDay();
      const slots = startDay + daysInMonth;
      if (slots > maxSlots) {
        maxSlots = slots;
      }
    }
    return maxSlots;
  }, [currentYear]);

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
    (e: any, date: Date) => {
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

  // Generate week header labels
  const weekLabels = useMemo(() => {
    const labels = getWeekDaysLabels(locale, 'short');
    const sundayStartLabels = [labels[6], ...labels.slice(0, 6)];

    const formattedLabels = sundayStartLabels.map(label => {
      if (locale.startsWith('zh')) {
        return label.charAt(label.length - 1);
      }
      const twoChars = label.substring(0, 2);
      return twoChars.charAt(0).toUpperCase() + twoChars.slice(1).toLowerCase();
    });

    const result = [];
    for (let i = 0; i < totalColumns; i++) {
      result.push(formattedLabels[i % 7]);
    }
    return result;
  }, [locale, getWeekDaysLabels, totalColumns]);

  // Helper to check if a date is today
  const isDateToday = (date: Date) => {
    return date.getTime() === today.getTime();
  };

  // Filter events for the current year
  const yearEvents = useMemo(() => {
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

  console.log('yearEvents', yearEvents.length);

  // Generate data for all 12 months with event segments
  const monthsData = useMemo(() => {
    const data = [];
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(currentYear, month, 1);
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      const paddingStart = monthStart.getDay();

      const days: (Date | null)[] = [];

      for (let i = 0; i < paddingStart; i++) {
        days.push(null);
      }

      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(currentYear, month, i));
      }

      while (days.length < totalColumns) {
        days.push(null);
      }

      const rawMonthName = monthStart.toLocaleDateString(locale, {
        month: 'short',
      });
      const monthName =
        rawMonthName.charAt(0).toUpperCase() +
        rawMonthName.slice(1).toLowerCase();

      // Analyze events for this month
      const { segments: eventSegments, maxVisualRow } = analyzeEventsForMonth(
        yearEvents,
        month,
        currentYear
      );

      // Calculate dynamic row height based on number of event rows
      const eventRows = maxVisualRow + 1;
      const minHeight = Math.max(
        MIN_ROW_HEIGHT,
        DATE_HEADER_HEIGHT + eventRows * EVENT_ROW_SPACING
      );

      data.push({
        monthIndex: month,
        monthName,
        days,
        eventSegments,
        minHeight,
      });
    }
    return data;
  }, [currentYear, locale, totalColumns, yearEvents]);

  // Handle scroll synchronization
  const handleContentScroll = useCallback((e: any) => {
    const target = e.currentTarget;
    if (weekLabelsRef.current) {
      weekLabelsRef.current.scrollLeft = target.scrollLeft;
    }
    if (monthLabelsRef.current) {
      monthLabelsRef.current.scrollTop = target.scrollTop;
    }
  }, []);

  // Measure scrollbar dimensions to sync the sidebar/header padding
  useEffect(() => {
    const measureScrollbars = () => {
      if (contentRef.current) {
        const el = contentRef.current;
        // Horizontal scrollbar height = offsetHeight - clientHeight
        const hScrollbar = el.offsetHeight - el.clientHeight;
        // Vertical scrollbar width = offsetWidth - clientWidth
        const vScrollbar = el.offsetWidth - el.clientWidth;

        setScrollbarHeight(prev => (prev !== hScrollbar ? hScrollbar : prev));
        setScrollbarWidth(prev => (prev !== vScrollbar ? vScrollbar : prev));
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
  }, [monthsData]); // Re-measure when content changes

  const getCustomTitle = () => {
    const isAsianLocale = locale.startsWith('zh') || locale.startsWith('ja');
    return isAsianLocale ? `${currentYear}年` : `${currentYear}`;
  };

  return (
    <div
      className="h-full bg-white dark:bg-gray-900 overflow-hidden select-none"
      style={{
        display: 'grid',
        gridTemplateColumns: '3rem 1fr',
        gridTemplateRows: 'auto auto 1fr',
      }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Year Header */}
      <div className="col-span-2">
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
      <div className="bg-gray-50 dark:bg-gray-900 border-r border-b border-gray-200 dark:border-gray-800 z-30" />

      {/* Week Labels Header */}
      <div
        ref={weekLabelsRef}
        className="overflow-hidden bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
      >
        <div
          className="flex"
          style={{ minWidth: `calc(1352px + ${scrollbarWidth}px)` }}
        >
          <div
            className="grid flex-1"
            style={{
              gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))`,
              minWidth: '1352px',
            }}
          >
            {weekLabels.map((label, i) => {
              const dayIndex = i % 7;
              const isWeekend = dayIndex === 0 || dayIndex === 6;
              return (
                <div
                  key={i}
                  className={`text-center py-2 text-[10px] font-bold tracking-wider border-r border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 ${isWeekend ? 'df-year-view-weekend-header' : ''}`}
                >
                  {label}
                </div>
              );
            })}
          </div>
          {/* Spacer to compensate for vertical scrollbar in content area */}
          {scrollbarWidth > 0 && (
            <div
              className="shrink-0 bg-gray-50 dark:bg-gray-900"
              style={{ width: `${scrollbarWidth}px` }}
            />
          )}
        </div>
      </div>

      {/* Month Labels Sidebar */}
      <div
        ref={monthLabelsRef}
        className="overflow-hidden bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700"
      >
        <div className="flex flex-col min-h-full">
          {monthsData.map(month => (
            <div
              key={month.monthIndex}
              className="flex items-center justify-center border-b border-gray-200 dark:border-gray-700 font-bold text-[10px] text-gray-500 dark:text-gray-400 flex-grow shrink-0"
              style={{ minHeight: `${month.minHeight}px` }}
            >
              {month.monthName}
            </div>
          ))}
          {/* Spacer to compensate for horizontal scrollbar in content area */}
          {scrollbarHeight > 0 && (
            <div
              className="shrink-0 bg-white dark:bg-gray-900"
              style={{ height: `${scrollbarHeight}px` }}
            />
          )}
        </div>
      </div>

      {/* Days Grid Content - Scrollable */}
      <div
        ref={contentRef}
        className={`overflow-auto ${scrollbarHide}`}
        onScroll={handleContentScroll}
      >
        <div
          className="flex flex-col min-h-full"
          style={{ minWidth: '1352px' }}
        >
          {monthsData.map(month => (
            <div
              key={month.monthIndex}
              className="relative flex-grow shrink-0"
              style={{ minHeight: `${month.minHeight}px` }}
            >
              {/* Background grid cells */}
              <div
                className="grid absolute inset-0 z-0"
                style={{
                  gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))`,
                }}
              >
                {month.days.map((date, dayIndex) => {
                  const weekdayIndex = dayIndex % 7;
                  const isWeekend = weekdayIndex === 0 || weekdayIndex === 6;

                  if (!date) {
                    return (
                      <div
                        key={`empty-${dayIndex}`}
                        className={`bg-gray-50/80 dark:bg-gray-800/40 border-r border-b border-gray-200 dark:border-gray-700 ${isWeekend ? 'df-year-view-weekend-cell' : ''}`}
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
                      className={`
                        relative flex items-start justify-end p-0.5 border-r border-b border-gray-200 dark:border-gray-700
                        cursor-pointer hover:bg-blue-100 dark:hover:bg-primary/20 transition-colors
                        ${isWeekend ? 'bg-blue-50 dark:bg-blue-900/30 df-year-view-weekend-cell' : ''}
                      `}
                      onClick={() => app.selectDate(date)}
                      onDblClick={e => handleCellDoubleClick(e, date)}
                      onContextMenu={e => handleContextMenu(e, date)}
                    >
                      <span
                        className={`
                          text-[10px] font-medium w-5 h-5 flex items-center justify-center rounded-full
                          ${
                            isToday
                              ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                              : 'text-gray-700 dark:text-gray-300'
                          }
                        `}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Event segments overlay */}
              {month.eventSegments.length > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none z-20"
                  style={{ top: 20 }}
                >
                  <div className="relative w-full h-full">
                    {month.eventSegments.map(segment => (
                      <div key={segment.id} className="pointer-events-auto">
                        <YearMultiDayEvent
                          segment={segment}
                          columnsPerRow={totalColumns}
                          isDragging={
                            isDragging && dragState.eventId === segment.event.id
                          }
                          isSelected={selectedEventId === segment.event.id}
                          onMoveStart={handleMoveStart}
                          onResizeStart={handleResizeStart}
                          onEventSelect={setSelectedEventId}
                          onDetailPanelToggle={setDetailPanelEventId}
                          newlyCreatedEventId={newlyCreatedEventId}
                          onDetailPanelOpen={() => setNewlyCreatedEventId(null)}
                          calendarRef={calendarRef}
                          app={app}
                          detailPanelEventId={detailPanelEventId}
                          customDetailPanelContent={customDetailPanelContent}
                          customEventDetailDialog={customEventDetailDialog}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
            const syntheticEvent = {
              preventDefault: () => {},
              stopPropagation: () => {},
              clientX: contextMenu.x,
              clientY: contextMenu.y,
            } as unknown as any;
            handleCellDoubleClick(syntheticEvent, contextMenu.date);
          }}
        />
      )}
    </div>
  );
};
