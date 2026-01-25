import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { CalendarApp } from '@/core';
import {
  formatTime,
  getEventsForDay,
  extractHourFromDate,
  createDateWithHour,
  getDateByDayIndex,
} from '@/utils';
import { useLocale } from '@/locale';
import {
  EventLayout,
  Event,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ViewType,
} from '@/types';
import CalendarEvent from '@/components/weekView/CalendarEvent';
import { EventLayoutCalculator } from '@/components/EventLayout';
import { useDragForView } from '@/plugins/dragPlugin';
import { ViewType as DragViewType, WeekDayDragState } from '@/types';
import { defaultDragConfig } from '@/core/config';
import ViewHeader from '@/components/common/ViewHeader';
import { MobileEventDrawer } from '@/components/mobileEventDrawer';
import { analyzeMultiDayEventsForWeek, analyzeMultiDayRegularEvent } from '@/components/monthView/util';
import { temporalToDate, dateToZonedDateTime } from '@/utils/temporal';
import { useCalendarDrop } from '@/hooks/useCalendarDrop';
import { useResponsiveMonthConfig } from '@/hooks/virtualScroll';
import {
  calendarContainer,
  weekDayHeader,
  weekDayCell,
  miniCalendarToday,
  dateNumber,
  allDayRow,
  allDayLabel,
  allDayContent,
  allDayCell,
  calendarContent,
  timeColumn,
  timeSlot,
  timeLabel,
  timeGridRow,
  timeGridCell,
  currentTimeLine,
  currentTimeLabel,
} from '@/styles/classNames';

interface WeekViewProps {
  app: CalendarApp; // Required prop, provided by CalendarRenderer
  customDetailPanelContent?: EventDetailContentRenderer; // Custom event detail content
  customEventDetailDialog?: EventDetailDialogRenderer; // Custom event detail dialog
  calendarRef: React.RefObject<HTMLDivElement>; // The DOM reference of the entire calendar passed from CalendarRenderer
}

const WeekView: React.FC<WeekViewProps> = ({
  app,
  customDetailPanelContent,
  customEventDetailDialog,
  calendarRef,
}) => {
  const { t, getWeekDaysLabels, locale } = useLocale();
  const currentDate = app.getCurrentDate();
  const events = app.getEvents();
  const { screenSize } = useResponsiveMonthConfig();
  const isMobile = screenSize !== 'desktop';
  const sidebarWidth = screenSize === 'mobile' ? 48 : 80;
  const [timeGridWidth, setTimeGridWidth] = useState(0);
  const timeGridRef = React.useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useLayoutEffect(() => {
    const timeGrid = timeGridRef.current;
    if (!timeGrid) return;

    const updateWidth = () => {
      setTimeGridWidth(timeGrid.offsetWidth);
    };

    // Initial measurement before paint
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(timeGrid);

    return () => observer.disconnect();
  }, []);

  console.log('screenSize', screenSize);

  const MobileEventDrawerComponent = app.getCustomMobileEventRenderer() || MobileEventDrawer;

  // Utility function: Get week start time
  const getWeekStart = (date: Date): Date => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Calculate the week start time for the current date
  const currentWeekStart = useMemo(
    () => getWeekStart(currentDate),
    [currentDate]
  );
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [detailPanelEventId, setDetailPanelEventId] = useState<string | null>(
    null
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [newlyCreatedEventId, setNewlyCreatedEventId] = useState<string | null>(
    null
  );

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [draftEvent, setDraftEvent] = useState<Event | null>(null);
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get configuration constants
  const {
    HOUR_HEIGHT,
    FIRST_HOUR,
    LAST_HOUR,
    TIME_COLUMN_WIDTH,
    ALL_DAY_HEIGHT,
  } = defaultDragConfig;

  // References
  const allDayRowRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const topFrozenContentRef = React.useRef<HTMLDivElement>(null);
  const leftFrozenContentRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (topFrozenContentRef.current) {
      topFrozenContentRef.current.scrollLeft = scrollLeft;
    }
    if (leftFrozenContentRef.current) {
      leftFrozenContentRef.current.style.transform = `translateY(${-scrollTop}px)`;
    }
  };

  // Events for the current week
  const currentWeekEvents = useMemo(() => {
    // Calculate the end time of the current week
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Filter events that overlap with the current week
    const filtered = events.filter(event => {
      const eventStart = temporalToDate(event.start);
      eventStart.setHours(0, 0, 0, 0);
      const eventEnd = temporalToDate(event.end);
      eventEnd.setHours(23, 59, 59, 999);

      // Check if the event intersects with the current week
      return eventEnd >= currentWeekStart && eventStart <= weekEnd;
    });

    // Recalculate the day field to fit the current week start time
    return filtered.map(event => {
      const eventDate = temporalToDate(event.start);
      const dayDiff = Math.floor(
        (eventDate.getTime() - currentWeekStart.getTime()) /
        (24 * 60 * 60 * 1000)
      );
      const correctDay = Math.max(0, Math.min(6, dayDiff)); // Ensure within 0-6 range

      return {
        ...event,
        day: correctDay,
      };
    });
  }, [events, currentWeekStart]);

  // Sync highlighted event from app state
  const prevHighlightedEventId = React.useRef(app.state.highlightedEventId);

  useEffect(() => {
    const hasChanged = app.state.highlightedEventId !== prevHighlightedEventId.current;

    if (hasChanged) {
      if (app.state.highlightedEventId) {
        setSelectedEventId(app.state.highlightedEventId);

        // Auto scroll to highlighted event
        const highlightedEvent = currentWeekEvents.find(
          e => e.id === app.state.highlightedEventId
        );
        if (highlightedEvent && !highlightedEvent.allDay) {
          const startHour = extractHourFromDate(highlightedEvent.start);
          const scrollContainer = scrollerRef.current;
          if (scrollContainer) {
            const top = (startHour - FIRST_HOUR) * HOUR_HEIGHT;
            // Scroll with some padding using requestAnimationFrame for smoother performance
            requestAnimationFrame(() => {
              scrollContainer.scrollTo({
                top: Math.max(0, top - 100),
                behavior: 'smooth',
              });
            });
          }
        }
      } else {
        setSelectedEventId(null);
      }
    }
    prevHighlightedEventId.current = app.state.highlightedEventId;
  }, [
    app.state.highlightedEventId,
    currentWeekEvents,
    FIRST_HOUR,
    HOUR_HEIGHT,
  ]);

  // Analyze multi-day all-day events
  const multiDaySegments = useMemo(
    () => analyzeMultiDayEventsForWeek(currentWeekEvents, currentWeekStart),
    [currentWeekEvents, currentWeekStart]
  );

  // Organize the hierarchy of all-day events to avoid overlap (only display all-day events, regular multi-day events are displayed in the time grid)
  const organizedAllDaySegments = useMemo(() => {
    const ROW_HEIGHT = 28; // Height per row
    const segments = multiDaySegments.filter(seg => seg.event.allDay);

    // Sort by start date and span
    segments.sort((a, b) => {
      if (a.startDayIndex !== b.startDayIndex) {
        return a.startDayIndex - b.startDayIndex;
      }
      const aDays = a.endDayIndex - a.startDayIndex;
      const bDays = b.endDayIndex - b.startDayIndex;
      return bDays - aDays; // Longer events first
    });

    // Assign row numbers
    const segmentsWithRow: Array<
      (typeof multiDaySegments)[0] & { row: number }
    > = [];

    segments.forEach(segment => {
      let row = 0;
      let foundRow = false;

      // Find available row
      while (!foundRow) {
        const hasConflict = segmentsWithRow.some(existing => {
          if (existing.row !== row) return false;
          // Check if time ranges overlap
          return !(
            segment.endDayIndex < existing.startDayIndex ||
            segment.startDayIndex > existing.endDayIndex
          );
        });

        if (!hasConflict) {
          foundRow = true;
        } else {
          row++;
        }
      }

      segmentsWithRow.push({ ...segment, row });
    });

    return segmentsWithRow;
  }, [multiDaySegments]);

  // Calculate the required height for the all-day event area
  const allDayAreaHeight = useMemo(() => {
    if (organizedAllDaySegments.length === 0) return ALL_DAY_HEIGHT;
    const maxRow = Math.max(...organizedAllDaySegments.map(s => s.row));
    return ALL_DAY_HEIGHT + maxRow * ALL_DAY_HEIGHT;
  }, [organizedAllDaySegments, ALL_DAY_HEIGHT]);

  // Calculate event layouts
  const eventLayouts = useMemo(() => {
    const allLayouts = new Map<number, Map<string, EventLayout>>();

    for (let day = 0; day < 7; day++) {
      // Collect all events that need to participate in layout calculation for this day
      const dayEventsForLayout: Event[] = [];

      currentWeekEvents.forEach(event => {
        if (event.allDay) return; // Skip all-day events

        const segments = analyzeMultiDayRegularEvent(event, currentWeekStart);

        if (segments.length > 0) {
          // Multi-day event: Check if this day has a segment
          const segment = segments.find(s => s.dayIndex === day);
          if (segment) {
            // Create virtual event for layout calculation
            // Note: For endHour = 24, ensure it is on the same day
            const segmentEndHour = segment.endHour >= 24 ? 23.99 : segment.endHour;

            const virtualEvent: Event = {
              ...event,
              start: dateToZonedDateTime(
                createDateWithHour(
                  getDateByDayIndex(currentWeekStart, day),
                  segment.startHour
                ) as Date
              ),
              end: dateToZonedDateTime(
                createDateWithHour(
                  getDateByDayIndex(currentWeekStart, day),
                  segmentEndHour
                ) as Date
              ),
              day: day,
            };
            dayEventsForLayout.push(virtualEvent);
          }
        } else {
          // Single-day event: Only include events on this day
          if (event.day === day) {
            dayEventsForLayout.push(event);
          }
        }
      });

      const dayLayouts = EventLayoutCalculator.calculateDayEventLayouts(
        dayEventsForLayout,
        { viewType: 'week' }
      );
      allLayouts.set(day, dayLayouts);
    }

    return allLayouts;
  }, [currentWeekEvents, currentWeekStart]);

  // Calculate layout for newly created events
  const calculateNewEventLayout = (
    targetDay: number,
    startHour: number,
    endHour: number
  ): EventLayout | null => {
    const startDate = new Date();
    const endDate = new Date();
    startDate.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);
    endDate.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);

    const tempEvent: Event = {
      id: '-1',
      title: 'Temp',
      day: targetDay,
      start: dateToZonedDateTime(startDate),
      end: dateToZonedDateTime(endDate),
      calendarId: 'blue',
      allDay: false,
    };

    const dayEvents = [
      ...currentWeekEvents.filter(e => e.day === targetDay && !e.allDay),
      tempEvent,
    ];
    const tempLayouts = EventLayoutCalculator.calculateDayEventLayouts(
      dayEvents,
      { viewType: 'week' }
    );
    return tempLayouts.get('-1') || null;
  };

  const calculateDragLayout = (
    draggedEvent: Event,
    targetDay: number,
    targetStartHour: number,
    targetEndHour: number
  ): EventLayout | null => {
    // Create temporary event list, including the dragged event in the new position
    const tempEvents = currentWeekEvents.map(e => {
      if (e.id !== draggedEvent.id) return e;

      const eventDateForCalc = temporalToDate(e.start);
      const newStartDate = createDateWithHour(
        eventDateForCalc,
        targetStartHour
      ) as Date;
      const newEndDate = createDateWithHour(
        eventDateForCalc,
        targetEndHour
      ) as Date;
      const newStart = dateToZonedDateTime(newStartDate);
      const newEnd = dateToZonedDateTime(newEndDate);

      return { ...e, day: targetDay, start: newStart, end: newEnd };
    });

    const dayEvents = tempEvents.filter(e => e.day === targetDay && !e.allDay);

    if (dayEvents.length === 0) return null;

    // Use layout calculator to calculate temporary layout
    const tempLayouts = EventLayoutCalculator.calculateDayEventLayouts(
      dayEvents,
      { viewType: 'week' }
    );
    return tempLayouts.get(draggedEvent.id) || null;
  };

  // Use drag functionality provided by the plugin
  const {
    handleMoveStart,
    handleCreateStart,
    handleResizeStart,
    handleCreateAllDayEvent,
    dragState,
    isDragging,
  } = useDragForView(app, {
    calendarRef,
    allDayRowRef,
    viewType: DragViewType.WEEK,
    onEventsUpdate: (
      updateFunc: (events: Event[]) => Event[],
      isResizing?: boolean
    ) => {
      const newEvents = updateFunc(currentWeekEvents);
      // Find events that need to be deleted (in old list but not in new list)
      const newEventIds = new Set(newEvents.map(e => e.id));
      const eventsToDelete = currentWeekEvents.filter(
        e => !newEventIds.has(e.id)
      );

      // Find events that need to be added (in new list but not in old list)
      const oldEventIds = new Set(currentWeekEvents.map(e => e.id));
      const eventsToAdd = newEvents.filter(e => !oldEventIds.has(e.id));

      // Find events that need to be updated (exist in both lists but content may differ)
      const eventsToUpdate = newEvents.filter(e => {
        if (!oldEventIds.has(e.id)) return false;
        const oldEvent = currentWeekEvents.find(old => old.id === e.id);
        // Check if there are real changes
        return (
          oldEvent &&
          (temporalToDate(oldEvent.start).getTime() !==
            temporalToDate(e.start).getTime() ||
            temporalToDate(oldEvent.end).getTime() !==
            temporalToDate(e.end).getTime() ||
            oldEvent.day !== e.day ||
            extractHourFromDate(oldEvent.start) !==
            extractHourFromDate(e.start) ||
            extractHourFromDate(oldEvent.end) !== extractHourFromDate(e.end) ||
            oldEvent.title !== e.title)
        );
      });

      // Perform operations - updateEvent will automatically trigger onEventUpdate callback
      eventsToDelete.forEach(event => app.deleteEvent(event.id));
      eventsToAdd.forEach(event => app.addEvent(event));
      eventsToUpdate.forEach(event =>
        app.updateEvent(event.id, event, isResizing)
      );
    },
    onEventCreate: (event: Event) => {
      if (isMobile) {
        setDraftEvent(event);
        setIsDrawerOpen(true);
      } else {
        app.addEvent(event);
      }
    },
    onEventEdit: () => {
      // Event edit handling (add logic here if needed)
    },
    currentWeekStart,
    events: currentWeekEvents,
    calculateNewEventLayout,
    calculateDragLayout,
    TIME_COLUMN_WIDTH: sidebarWidth,
    isMobile,
  });

  const handleTouchStart = (e: React.TouchEvent, dayIndex: number, hour: number) => {
    if (!isMobile && !isTouch) return;
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    const target = e.currentTarget;

    longPressTimerRef.current = setTimeout(() => {
      const mockEvent = {
        preventDefault: () => { },
        stopPropagation: () => { },
        touches: [{ clientX, clientY }],
        changedTouches: [{ clientX, clientY }],
        target: target,
        currentTarget: target,
        cancelable: true,
      } as unknown as React.TouchEvent;

      handleCreateStart?.(mockEvent, dayIndex, hour);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Use calendar drop functionality
  const { handleDrop, handleDragOver } = useCalendarDrop({
    app,
    onEventCreated: (event: Event) => {
      setNewlyCreatedEventId(event.id);
    },
  });

  const weekDaysLabels = useMemo(() => {
    return getWeekDaysLabels(locale, 'short');
  }, [locale, getWeekDaysLabels]);

  const mobileWeekDaysLabels = useMemo(() => {
    if (!isMobile) return [];
    const lang = locale.split('-')[0].toLowerCase();
    if (lang === 'zh' || lang === 'ja') {
      return getWeekDaysLabels(locale, 'narrow');
    }
    // English or other languages: M, Tu, W, Th, F, Sa, Su
    return weekDaysLabels.map(label => {
      if (lang === 'en') {
        if (label.startsWith('Tu')) return 'Tu';
        if (label.startsWith('Th')) return 'Th';
        if (label.startsWith('Sa')) return 'Sa';
        if (label.startsWith('Su')) return 'Su';
      }
      return label.charAt(0);
    });
  }, [isMobile, locale, getWeekDaysLabels, weekDaysLabels]);

  const allDayLabelText = useMemo(() => {
    return t('allDay');
  }, [t]);

  const timeSlots = Array.from({ length: 24 }, (_, i) => ({
    hour: i + FIRST_HOUR,
    label: formatTime(i + FIRST_HOUR),
  }));

  // Generate week date data
  const weekDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare date part only
    return weekDaysLabels.map((_, index) => {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + index);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      return {
        date: date.getDate(),
        month: date.toLocaleString(locale, { month: 'short' }),
        fullDate: new Date(date),
        isToday: dateOnly.getTime() === today.getTime(),
      };
    });
  }, [currentWeekStart, weekDaysLabels, locale]);

  // Event handling functions
  const handleEventUpdate = (updatedEvent: Event) => {
    app.updateEvent(updatedEvent.id, updatedEvent);
  };

  const handleEventDelete = (eventId: string) => {
    app.deleteEvent(eventId);
  };

  // Check if it is the current week
  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    const todayWeekStart = getWeekStart(today);
    return currentWeekStart.getTime() === todayWeekStart.getTime();
  }, [currentWeekStart]);

  // Timer
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const gridWidth = isMobile ? '175%' : '100%';
  const columnStyle: React.CSSProperties = { flexShrink: 0 };

  return (
    <div className={calendarContainer}>
      {/* Header navigation */}
      <ViewHeader
        calendar={app}
        viewType={ViewType.WEEK}
        currentDate={currentDate}
        onPrevious={() => app.goToPrevious()}
        onNext={() => app.goToNext()}
        onToday={() => app.goToToday()}
      />

      {/* Top Frozen Row (Header + All Day) */}
      <div className="flex flex-none border-b border-gray-200 dark:border-gray-700 relative z-10">
        {/* Top Frozen Content */}
        <div ref={topFrozenContentRef} className="flex-1 overflow-hidden relative">
          <div className="flex flex-col min-w-full">
            {/* Weekday titles row */}
            <div className="flex w-full">
              <div className="flex shrink-0" style={{
                width: timeGridWidth ? timeGridWidth + sidebarWidth : '100%',
              }}>
                {/* Header Spacer */}
                <div className="w-12 md:w-20 shrink-0 sticky left-0 bg-white dark:bg-gray-900 z-20 border-b border-gray-200 dark:border-gray-700"></div>
                {/* Weekday titles */}
                <div className={`${weekDayHeader} flex-1`}>
                  {weekDaysLabels.map((day, i) => (
                    <div
                      key={i}
                      className={`${weekDayCell} ${isMobile ? 'flex-col gap-0' : ''}`}
                      style={columnStyle}
                    >
                      {isMobile ? (
                        <>
                          <div className="text-[11px] leading-tight text-gray-500 font-medium">
                            {mobileWeekDaysLabels[i]}
                          </div>
                          <div className={`${dateNumber} w-7 h-7 text-base font-medium ${weekDates[i].isToday ? miniCalendarToday : ''}`}>
                            {weekDates[i].date}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="inline-flex items-center justify-center text-sm mt-1 mr-1">
                            {day}
                          </div>
                          <div className={`${dateNumber} ${weekDates[i].isToday ? miniCalendarToday : ''}`}>
                            {weekDates[i].date}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Filler for Weekday Header */}
              <div className="flex-1 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"></div>
            </div>

            {/* All-day event area row */}
            <div className="flex w-full">
              <div className="flex shrink-0" style={{
                width: timeGridWidth ? timeGridWidth + sidebarWidth : '100%',
              }}>
                {/* All Day Label */}
                <div className="w-12 md:w-20 shrink-0 flex items-center justify-end p-1 text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400 select-none bg-white dark:bg-gray-900 sticky left-0 z-20 ">
                  {allDayLabelText}
                </div>

                <div className={`${allDayRow} border-none flex-1`} ref={allDayRowRef} style={{ minHeight: `${allDayAreaHeight}px` }}>
                  <div className={allDayContent} style={{ minHeight: `${allDayAreaHeight}px` }}>
                    {weekDaysLabels.map((_, dayIndex) => {
                      const dropDate = new Date(currentWeekStart);
                      dropDate.setDate(currentWeekStart.getDate() + dayIndex);
                      return (
                        <div
                          key={`allday-${dayIndex}`}
                          className={`${allDayCell} ${isMobile && dayIndex === weekDaysLabels.length - 1 ? 'border-r-0' : ''}`}
                          style={{ minHeight: `${allDayAreaHeight}px`, ...columnStyle }} onDoubleClick={e => handleCreateAllDayEvent?.(e, dayIndex)}
                          onDragOver={handleDragOver}
                          onDrop={e => {
                            handleDrop(e, dropDate, undefined, true);
                          }}
                        />
                      );
                    })}
                    {/* <div className='w-[11px]'></div> */}
                    {/* Multi-day event overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      {organizedAllDaySegments.map(segment => {
                        return (
                          <CalendarEvent
                            key={segment.id}
                            event={segment.event}
                            segment={segment}
                            segmentIndex={segment.row}
                            isAllDay={true}
                            isMultiDay={true}
                            allDayHeight={ALL_DAY_HEIGHT}
                            calendarRef={calendarRef}
                            isBeingDragged={
                              isDragging &&
                              (dragState as WeekDayDragState)?.eventId ===
                              segment.event.id &&
                              (dragState as WeekDayDragState)?.mode === 'move'
                            }
                            hourHeight={HOUR_HEIGHT}
                            firstHour={FIRST_HOUR}
                            onMoveStart={handleMoveStart}
                            onResizeStart={handleResizeStart}
                            onEventUpdate={handleEventUpdate}
                            onEventDelete={handleEventDelete}
                            newlyCreatedEventId={newlyCreatedEventId}
                            onDetailPanelOpen={() => setNewlyCreatedEventId(null)}
                            selectedEventId={selectedEventId}
                            detailPanelEventId={detailPanelEventId}
                            onEventSelect={(eventId: string | null) => {
                              const isViewable = app.getReadOnlyConfig().viewable !== false;
                              const isReadOnly = app.state.readOnly;
                              if ((isMobile || isTouch) && eventId && isViewable && !isReadOnly) {
                                const evt = events.find(e => e.id === eventId);
                                if (evt) {
                                  setDraftEvent(evt);
                                  setIsDrawerOpen(true);
                                  return;
                                }
                              } setSelectedEventId(eventId);
                            }}
                            onEventLongPress={(eventId: string) => {
                              if (isMobile || isTouch) setSelectedEventId(eventId);
                            }}
                            onDetailPanelToggle={(eventId: string | null) =>
                              setDetailPanelEventId(eventId)
                            }
                            customDetailPanelContent={customDetailPanelContent}
                            customEventDetailDialog={customEventDetailDialog}
                            app={app}
                            isMobile={isMobile}
                            enableTouch={isTouch}
                          />);
                      })}
                    </div>
                  </div>
                </div>
              </div>
              {/* Filler for All Day Row */}
              <div className="flex-1  bg-white dark:bg-gray-900"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body (Left Column + Scroller) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Frozen Column */}
        <div className="w-12 md:w-20 shrink-0 overflow-hidden relative bg-white dark:bg-gray-900 z-10">
          <div ref={leftFrozenContentRef}>
            {timeSlots.map((slot, slotIndex) => (
              <div key={slotIndex} className={timeSlot}>
                <div className={`${timeLabel} text-[10px] md:text-[12px]`}>
                  {slotIndex === 0 ? '' : slot.label}
                </div>
              </div>
            ))}
            <div className="relative">
              <div className={`${timeLabel} text-[10px] md:text-[12px]`}>00:00</div>
            </div>
            {/* Current Time Label */}
            {isCurrentWeek && currentTime &&
              (() => {
                const now = currentTime;
                const hours = now.getHours() + now.getMinutes() / 60;
                if (hours < FIRST_HOUR || hours > LAST_HOUR) return null;

                const topPx = (hours - FIRST_HOUR) * HOUR_HEIGHT;

                return (
                  <div
                    className="absolute left-0 w-full z-20 pointer-events-none flex items-center justify-end"
                    style={{ top: `${topPx}px`, transform: 'translateY(-50%)' }}
                  >
                    <div className={currentTimeLabel}>{formatTime(hours)}</div>
                  </div>
                );
              })()}
          </div>
        </div>

        {/* Scroller */}
        <div ref={scrollerRef} className="flex-1 overflow-auto relative calendar-content snap-x snap-mandatory" onScroll={handleScroll}>
          <div ref={timeGridRef} className="relative flex" style={{ width: gridWidth, minWidth: '100%' }}>
            {/* Current time line */}
            {isCurrentWeek && currentTime &&
              (() => {
                const now = currentTime;
                const hours = now.getHours() + now.getMinutes() / 60;
                if (hours < FIRST_HOUR || hours > LAST_HOUR) return null;

                const jsDay = now.getDay();
                const todayIndex = jsDay === 0 ? 6 : jsDay - 1;
                const topPx = (hours - FIRST_HOUR) * HOUR_HEIGHT;

                return (
                  <div
                    className={currentTimeLine}
                    style={{
                      top: `${topPx}px`,
                      width: '100%',
                      height: 0,
                      zIndex: 20,
                    }}
                  >
                    <div
                      className="flex items-center w-0"
                    >
                      {/* Empty left part since it is in frozen column now */}
                    </div>

                    <div className="flex flex-1">
                      {weekDaysLabels.map((_, idx) => (
                        <div key={idx} className="flex-1 flex items-center" >
                          <div
                            className={`h-0.5 w-full relative ${idx === todayIndex
                              ? 'bg-primary'
                              : 'bg-primary/30'
                              }`} style={{
                                zIndex: 9999,
                              }}
                          >
                            {idx === todayIndex && todayIndex !== 0 && (
                              <div
                                className="absolute w-2 h-2 bg-primary rounded-full"
                                style={{ top: '-3px', left: '-4px' }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

            {/* Time Grid */}
            <div className="grow relative">
              {timeSlots.map((slot, slotIndex) => (
                <div key={slotIndex} className={timeGridRow}>
                  {weekDaysLabels.map((_, dayIndex) => {
                    const dropDate = new Date(currentWeekStart);
                    dropDate.setDate(currentWeekStart.getDate() + dayIndex);
                    return (
                      <div
                        key={`${slotIndex}-${dayIndex}`}
                        className={`${timeGridCell} snap-start ${isMobile && dayIndex === weekDaysLabels.length - 1 ? 'border-r-0' : ''}`}
                        style={columnStyle}
                        onDoubleClick={e => {
                          handleCreateStart?.(e, dayIndex, slot.hour);
                        }}
                        onTouchStart={e => handleTouchStart(e, dayIndex, slot.hour)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchMove}
                        onDragOver={handleDragOver}
                        onDrop={e => {
                          handleDrop(e, dropDate, slot.hour);
                        }}
                      />
                    );
                  })}
                </div>
              ))}

              {/* Bottom boundary */}
              <div className="h-3 border-t border-gray-200 dark:border-gray-700 flex relative">
                {weekDaysLabels.map((_, dayIndex) => (
                  <div
                    key={`24-${dayIndex}`}
                    className={`flex-1 relative ${dayIndex === weekDaysLabels.length - 1 ? '' : 'border-r'} border-gray-200 dark:border-gray-700`}
                    style={columnStyle}
                  />
                ))}
              </div>

              {/* Event layer */}
              {weekDaysLabels.map((_, dayIndex) => {
                // Collect all event segments for this day
                const dayEvents = getEventsForDay(dayIndex, currentWeekEvents);
                const allEventSegments: Array<{
                  event: Event;
                  segmentInfo?: { startHour: number; endHour: number; isFirst: boolean; isLast: boolean; dayIndex?: number };
                }> = [];

                dayEvents.forEach(event => {
                  const segments = analyzeMultiDayRegularEvent(event, currentWeekStart);
                  if (segments.length > 0) {
                    const segment = segments.find(s => s.dayIndex === dayIndex);
                    if (segment) {
                      allEventSegments.push({ event, segmentInfo: { ...segment, dayIndex } });
                    }
                  } else {
                    allEventSegments.push({ event });
                  }
                });

                currentWeekEvents.forEach(event => {
                  if (event.allDay || event.day === dayIndex) return;
                  const segments = analyzeMultiDayRegularEvent(event, currentWeekStart);
                  const segment = segments.find(s => s.dayIndex === dayIndex);
                  if (segment) {
                    allEventSegments.push({ event, segmentInfo: { ...segment, dayIndex } });
                  }
                });

                return (
                  <div
                    key={`events-day-${dayIndex}`}
                    className="absolute top-0 pointer-events-none"
                    style={{
                      left: `calc(${(100 / 7) * dayIndex}%)`,
                      width: `${100 / 7}%`,
                      height: '100%',
                    }}
                  >
                    {allEventSegments.map(({ event, segmentInfo }) => {
                      const dayLayouts = eventLayouts.get(dayIndex);
                      const eventLayout = dayLayouts?.get(event.id);

                      return (
                        <CalendarEvent
                          key={segmentInfo ? `${event.id}-seg-${dayIndex}` : event.id}
                          event={event}
                          layout={eventLayout}
                          calendarRef={calendarRef}
                          isBeingDragged={
                            isDragging &&
                            (dragState as WeekDayDragState)?.eventId === event.id &&
                            (dragState as WeekDayDragState)?.mode === 'move'
                          }
                          hourHeight={HOUR_HEIGHT}
                          firstHour={FIRST_HOUR}
                          onMoveStart={handleMoveStart}
                          onResizeStart={handleResizeStart}
                          onEventUpdate={handleEventUpdate}
                          onEventDelete={handleEventDelete}
                          newlyCreatedEventId={newlyCreatedEventId}
                          onDetailPanelOpen={() => setNewlyCreatedEventId(null)}
                          selectedEventId={selectedEventId}
                          detailPanelEventId={detailPanelEventId}
                          onEventSelect={(eventId: string | null) => {
                            const isViewable = app.getReadOnlyConfig().viewable !== false;
                            const isReadOnly = app.state.readOnly;
                            if ((isMobile || isTouch) && eventId && isViewable && !isReadOnly) {
                              const evt = events.find(e => e.id === eventId);
                              if (evt) {
                                setDraftEvent(evt);
                                setIsDrawerOpen(true);
                                return;
                              }
                            }
                            setSelectedEventId(eventId);
                            if (app.state.highlightedEventId) {
                              app.highlightEvent(null);
                              prevHighlightedEventId.current = null;
                            }
                          }}
                          onEventLongPress={(eventId: string) => {
                            if (isMobile || isTouch) setSelectedEventId(eventId);
                          }}
                          onDetailPanelToggle={(eventId: string | null) =>
                            setDetailPanelEventId(eventId)
                          }
                          customDetailPanelContent={customDetailPanelContent}
                          customEventDetailDialog={customEventDetailDialog}
                          multiDaySegmentInfo={segmentInfo}
                          app={app}
                          isMobile={isMobile}
                          enableTouch={isTouch}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <MobileEventDrawerComponent
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setDraftEvent(null);
        }}
        onSave={(updatedEvent) => {
          if (events.find(e => e.id === updatedEvent.id)) {
            app.updateEvent(updatedEvent.id, updatedEvent);
          } else {
            app.addEvent(updatedEvent);
          }
          setIsDrawerOpen(false);
          setDraftEvent(null);
        }}
        draftEvent={draftEvent}
        app={app}
      />
    </div>
  );
};

export default WeekView;