import React, { useState, useEffect, useMemo } from 'react';
import { CalendarApp } from '@/core';
import {
  formatTime,
  getEventsForDay,
  extractHourFromDate,
  createDateWithHour,
  getDateByDayIndex,
} from '@/utils';
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
import ViewHeader, { ViewSwitcherMode } from '@/components/common/ViewHeader';
import { analyzeMultiDayEventsForWeek, analyzeMultiDayRegularEvent } from '@/components/monthView/util';
import { temporalToDate, dateToZonedDateTime } from '@/utils/temporal';
import { useCalendarDrop } from '@/hooks/useCalendarDrop';
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
  switcherMode?: ViewSwitcherMode;
}

const WeekView: React.FC<WeekViewProps> = ({
  app,
  customDetailPanelContent,
  customEventDetailDialog,
  calendarRef,
  switcherMode = 'buttons',
}) => {
  const currentDate = app.getCurrentDate();
  const events = app.getEvents();

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
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [detailPanelEventId, setDetailPanelEventId] = useState<string | null>(
    null
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [newlyCreatedEventId, setNewlyCreatedEventId] = useState<string | null>(
    null
  );

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
      app.addEvent(event);
    },
    onEventEdit: () => {
      // Event edit handling (add logic here if needed)
    },
    currentWeekStart,
    events: currentWeekEvents,
    calculateNewEventLayout,
    calculateDragLayout,
  });

  // Use calendar drop functionality
  const { handleDrop, handleDragOver } = useCalendarDrop({
    app,
    onEventCreated: (event: Event) => {
      setNewlyCreatedEventId(event.id);
    },
  });

  const weekDays = useMemo(
    () => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    []
  );
  const timeSlots = Array.from({ length: 24 }, (_, i) => ({
    hour: i + FIRST_HOUR,
    label: formatTime(i + FIRST_HOUR),
  }));

  // Generate week date data
  const weekDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare date part only
    return weekDays.map((_, index) => {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + index);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      return {
        date: date.getDate(),
        month: date.toLocaleString('default', { month: 'short' }),
        fullDate: new Date(date),
        isToday: dateOnly.getTime() === today.getTime(),
      };
    });
  }, [currentWeekStart, weekDays]);

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
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={calendarContainer}>
      {/* Header navigation */}
      <ViewHeader
        calendar={app}
        viewType={ViewType.WEEK}
        currentDate={currentDate}
        switcherMode={switcherMode}
        onPrevious={() => app.goToPrevious()}
        onNext={() => app.goToNext()}
        onToday={() => app.goToToday()}
      />

      {/* Weekday titles */}
      <div className={weekDayHeader}>
        <div className="w-20 p-2"></div>
        {weekDays.map((day, i) => (
          <div key={i} className={weekDayCell}>
            <div className="inline-flex items-center justify-center text-sm h-6 w-6 mt-1 mr-1">
              {day}
            </div>
            <div className={`${dateNumber} ${weekDates[i].isToday ? miniCalendarToday : ''}`}>
              {weekDates[i].date}
            </div>
          </div>
        ))}
      </div>

      {/* All-day event area */}
      <div className={allDayRow} ref={allDayRowRef}>
        <div className={allDayLabel}>all-day</div>
        <div
          className={allDayContent}
          style={{ minHeight: `${allDayAreaHeight}px` }}
        >
          {weekDays.map((_, dayIndex) => {
            const dropDate = new Date(currentWeekStart);
            dropDate.setDate(currentWeekStart.getDate() + dayIndex);
            return (
              <div
                key={`allday-${dayIndex}`}
                className={allDayCell}
                style={{ minHeight: `${allDayAreaHeight}px` }}
                onDoubleClick={e => handleCreateAllDayEvent?.(e, dayIndex)}
                onDragOver={handleDragOver}
                onDrop={e => {
                  handleDrop(e, dropDate, undefined, true);
                }}
              />
            );
          })}

          {/* Multi-day event overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {organizedAllDaySegments.map(segment => (
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
                onEventSelect={(eventId: string | null) =>
                  setSelectedEventId(eventId)
                }
                onDetailPanelToggle={(eventId: string | null) =>
                  setDetailPanelEventId(eventId)
                }
                customDetailPanelContent={customDetailPanelContent}
                customEventDetailDialog={customEventDetailDialog}
                app={app}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Time grid and event area */}
      <div className={calendarContent} style={{ position: 'relative' }}>
        <div className="relative flex">
          {/* Current time line */}
          {isCurrentWeek &&
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
                    className="flex items-center"
                    style={{ width: `${TIME_COLUMN_WIDTH}px` }}
                  >
                    <div className="relative w-full flex items-center"></div>
                    <div className={currentTimeLabel}>{formatTime(hours)}</div>
                  </div>

                  <div className="flex flex-1">
                    {weekDays.map((_, idx) => (
                      <div key={idx} className="flex-1 flex items-center">
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

          {/* Time column */}
          <div className={timeColumn}>
            {timeSlots.map((slot, slotIndex) => (
              <div key={slotIndex} className={timeSlot}>
                <div className={timeLabel}>
                  {slotIndex === 0 ? '' : slot.label}
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="grow relative">
            {timeSlots.map((slot, slotIndex) => (
              <div key={slotIndex} className={timeGridRow}>
                {weekDays.map((_, dayIndex) => {
                  const dropDate = new Date(currentWeekStart);
                  dropDate.setDate(currentWeekStart.getDate() + dayIndex);
                  return (
                    <div
                      key={`${slotIndex}-${dayIndex}`}
                      className={timeGridCell}
                      onDoubleClick={e => {
                        handleCreateStart(e, dayIndex, slot.hour);
                      }}
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
              <div className="absolute -top-2.5 -left-9 text-[12px] text-gray-500 dark:text-gray-400">
                00.00
              </div>
              {weekDays.map((_, dayIndex) => (
                <div
                  key={`24-${dayIndex}`}
                  className={`flex-1 relative border-r border-gray-200 dark:border-gray-700`}
                />
              ))}
            </div>

            {/* Event layer */}
            {weekDays.map((_, dayIndex) => {
              // Collect all event segments for this day (including segments of multi-day events)
              const dayEvents = getEventsForDay(dayIndex, currentWeekEvents);
              const allEventSegments: Array<{
                event: Event;
                segmentInfo?: { startHour: number; endHour: number; isFirst: boolean; isLast: boolean; dayIndex?: number };
              }> = [];

              // Add regular events starting on this day
              dayEvents.forEach(event => {
                const segments = analyzeMultiDayRegularEvent(event, currentWeekStart);
                if (segments.length > 0) {
                  // Multi-day event: Add the segment for this day
                  const segment = segments.find(s => s.dayIndex === dayIndex);
                  if (segment) {
                    allEventSegments.push({ event, segmentInfo: { ...segment, dayIndex } });
                  }
                } else {
                  // Single-day event
                  allEventSegments.push({ event });
                }
              });

              // Add segments of events starting on other days but spanning to this day
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
                        onEventSelect={(eventId: string | null) =>
                          setSelectedEventId(eventId)
                        }
                        onDetailPanelToggle={(eventId: string | null) =>
                          setDetailPanelEventId(eventId)
                        }
                        customDetailPanelContent={customDetailPanelContent}
                        customEventDetailDialog={customEventDetailDialog}
                        multiDaySegmentInfo={segmentInfo}
                        app={app}
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
  );
};

export default WeekView;