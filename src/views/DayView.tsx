import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarApp } from '@/core';
import {
  formatTime,
  weekDays,
  extractHourFromDate,
  createDateWithHour,
  getLineColor,
  getEventEndHour,
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
import ViewHeader, { ViewSwitcherMode } from '@/components/common/ViewHeader';
import TodayBox from '@/components/common/TodayBox';
import ViewSwitcher from '@/components/common/ViewSwitcher';
import { MiniCalendar } from '@/components/common/MiniCalendar';
import { temporalToDate, dateToZonedDateTime } from '@/utils/temporal';
import { useCalendarDrop } from '@/hooks/useCalendarDrop';
import {
  allDayRow,
  allDayLabel,
  calendarContent,
  timeColumn,
  timeSlot,
  timeLabel,
  timeGridRow,
  currentTimeLine,
  currentTimeLabel,
  currentTimeLineBar,
  miniCalendarContainer,
  bgGray50,
  flexCol,
  p2,
  p4,
  mb3,
  textXs,
  textLg,
  textSm,
  textGray500,
  textGray600,
  headerContainer,
  headerTitle,
} from '@/styles/classNames';

interface DayViewProps {
  app: CalendarApp; // Required prop, provided by CalendarRenderer
  customDetailPanelContent?: EventDetailContentRenderer; // Custom event detail content
  customEventDetailDialog?: EventDetailDialogRenderer; // Custom event detail dialog
  calendarRef: React.RefObject<HTMLDivElement>; // The DOM reference of the entire calendar passed from CalendarRenderer
  switcherMode?: ViewSwitcherMode;
}

const DayView: React.FC<DayViewProps> = ({
  app,
  customDetailPanelContent,
  customEventDetailDialog,
  calendarRef,
  switcherMode = 'buttons',
}) => {
  const events = app.getEvents();
  const { t, locale } = useLocale();

  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [detailPanelEventId, setDetailPanelEventId] = useState<string | null>(
    null
  );

  // Sync highlighted event from app state
  const prevHighlightedEventId = React.useRef(app.state.highlightedEventId);

  useEffect(() => {
    if (app.state.highlightedEventId) {
      const currentEvents = app.getEvents();
      const event = currentEvents.find(e => e.id === app.state.highlightedEventId);
      if (event) {
        setSelectedEvent(event);
      }
    } else if (prevHighlightedEventId.current) {
      // Only clear if previously had a highlighted event
      setSelectedEvent(null);
    }
    prevHighlightedEventId.current = app.state.highlightedEventId;
  }, [app.state.highlightedEventId]);

  const [newlyCreatedEventId, setNewlyCreatedEventId] = useState<string | null>(
    null
  );

  const currentDate = app.getCurrentDate();
  const visibleMonthDate = app.getVisibleMonth();
  const visibleYear = visibleMonthDate.getFullYear();
  const visibleMonthIndex = visibleMonthDate.getMonth();
  // Visible Month State
  const [visibleMonth, setVisibleMonth] = useState(currentDate);
  const prevDateRef = React.useRef(currentDate.getTime());

  if (currentDate.getTime() !== prevDateRef.current) {
    prevDateRef.current = currentDate.getTime();
    if (
      currentDate.getFullYear() !== visibleMonth.getFullYear() ||
      currentDate.getMonth() !== visibleMonth.getMonth()
    ) {
      setVisibleMonth(currentDate);
    }
  }

  const handleMonthChange = useCallback(
    (offset: number) => {
      setVisibleMonth(prev => {
        const next = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
        app.setVisibleMonth(next);
        return next;
      });
    },
    [app]
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

  // Events for the current date
  const currentDayEvents = useMemo(() => {
    const filtered = events.filter(event => {
      const eventDate = temporalToDate(event.start);
      eventDate.setHours(0, 0, 0, 0);
      const targetDate = new Date(currentDate);
      targetDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === targetDate.getTime();
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
  }, [events, currentDate, currentWeekStart]);

  // Calculate event layouts
  const eventLayouts = useMemo(() => {
    return EventLayoutCalculator.calculateDayEventLayouts(currentDayEvents, {
      viewType: 'day',
    });
  }, [currentDayEvents]);

  // Calculate layout for newly created events
  const calculateNewEventLayout = (
    targetDay: number,
    startHour: number,
    endHour: number
  ): EventLayout | null => {
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
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

    const dayEvents = [...currentDayEvents.filter(e => !e.allDay), tempEvent];
    const tempLayouts = EventLayoutCalculator.calculateDayEventLayouts(
      dayEvents,
      { viewType: 'day' }
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
    const tempEvents = currentDayEvents.map(e => {
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

    const dayEvents = tempEvents.filter(e => !e.allDay);

    if (dayEvents.length === 0) return null;

    // Use layout calculator to calculate temporary layout
    const tempLayouts = EventLayoutCalculator.calculateDayEventLayouts(
      dayEvents,
      { viewType: 'day' }
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
    viewType: DragViewType.DAY,
    onEventsUpdate: (updateFunc: (events: Event[]) => Event[]) => {
      const newEvents = updateFunc(currentDayEvents);

      // Find events that need to be deleted (in old list but not in new list)
      const newEventIds = new Set(newEvents.map(e => e.id));
      const eventsToDelete = currentDayEvents.filter(
        e => !newEventIds.has(e.id)
      );

      // Find events that need to be added (in new list but not in old list)
      const oldEventIds = new Set(currentDayEvents.map(e => e.id));
      const eventsToAdd = newEvents.filter(e => !oldEventIds.has(e.id));

      // Find events that need to be updated (exist in both lists but content may differ)
      const eventsToUpdate = newEvents.filter(e => {
        if (!oldEventIds.has(e.id)) return false;
        const oldEvent = currentDayEvents.find(old => old.id === e.id);
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
      eventsToUpdate.forEach(event => app.updateEvent(event.id, event));
    },
    onEventCreate: (event: Event) => {
      app.addEvent(event);
    },
    onEventEdit: () => {
      // Event edit handling (add logic here if needed)
    },
    currentWeekStart,
    events: currentDayEvents,
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

  // Event handling functions
  const handleEventUpdate = (updatedEvent: Event) => {
    app.updateEvent(updatedEvent.id, updatedEvent);
  };

  const handleEventDelete = (eventId: string) => {
    app.deleteEvent(eventId);
  };

  const timeSlots = Array.from({ length: 24 }, (_, i) => ({
    hour: i + FIRST_HOUR,
    label: formatTime(i + FIRST_HOUR),
  }));

  // Date selection handling
  const handleDateSelect = useCallback(
    (date: Date) => {
      const nextDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      app.setCurrentDate(nextDate);
      setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    },
    [app]
  );
  // Check if it is today
  const isToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const current = new Date(currentDate);
    current.setHours(0, 0, 0, 0);
    return current.getTime() === today.getTime();
  }, [currentDate]);

  // Timer
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`flex h-full ${bgGray50}`}>
      {/* Left time axis area - 70% */}
      <div
        className={`flex-none ${switcherMode === 'buttons' ? '' : 'md:w-[60%]'} w-full md:w-[70%] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700`}
      >
        <div className={`relative ${flexCol} h-full`}>
          {/* Fixed navigation bar */}
          <ViewHeader
            calendar={app}
            viewType={ViewType.DAY}
            currentDate={currentDate}
            customSubtitle={currentDate.toLocaleDateString(locale, {
              weekday: 'long',
            })}
          />
          {/* All-day event area */}
          <div className={`${allDayRow} pt-px`} ref={allDayRowRef}>
            <div className={allDayLabel}>{t('allDay')}</div>
            <div className="flex flex-1 relative">
              <div
                className="w-full relative"
                style={{ minHeight: `${ALL_DAY_HEIGHT}px` }}
                onDoubleClick={e => {
                  const currentDayIndex = Math.floor(
                    (currentDate.getTime() - currentWeekStart.getTime()) /
                    (24 * 60 * 60 * 1000)
                  );
                  handleCreateAllDayEvent?.(e, currentDayIndex);
                }}
                onDragOver={handleDragOver}
                onDrop={e => {
                  handleDrop(e, currentDate, undefined, true);
                }}
              >
                {currentDayEvents
                  .filter(event => event.allDay)
                  .map(event => (
                    <CalendarEvent
                      key={event.id}
                      event={event}
                      isAllDay={true}
                      isDayView={true}
                      allDayHeight={ALL_DAY_HEIGHT}
                      calendarRef={calendarRef}
                      isBeingDragged={
                        isDragging &&
                        (dragState as WeekDayDragState)?.eventId === event.id &&
                        (dragState as WeekDayDragState)?.mode === 'move'
                      }
                      hourHeight={HOUR_HEIGHT}
                      firstHour={FIRST_HOUR}
                      onMoveStart={handleMoveStart}
                      onEventUpdate={handleEventUpdate}
                      onEventDelete={handleEventDelete}
                      newlyCreatedEventId={newlyCreatedEventId}
                      onDetailPanelOpen={() => setNewlyCreatedEventId(null)}
                      detailPanelEventId={detailPanelEventId}
                      onDetailPanelToggle={(eventId: string | null) =>
                        setDetailPanelEventId(eventId)
                      }
                      selectedEventId={selectedEvent?.id ?? null}
                      onEventSelect={(eventId: string | null) => {
                        const evt = events.find(e => e.id === eventId);
                        setSelectedEvent(evt || null);
                      }}
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
              {isToday && currentTime &&
                (() => {
                  const now = currentTime;
                  const hours = now.getHours() + now.getMinutes() / 60;
                  if (hours < FIRST_HOUR || hours > LAST_HOUR) return null;

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
                        <div className={currentTimeLabel}>
                          {formatTime(hours)}
                        </div>
                      </div>

                      <div className="flex-1 flex items-center">
                        <div className={currentTimeLineBar} />
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
                  <div
                    key={slotIndex}
                    className={timeGridRow}
                    onDoubleClick={e => {
                      const currentDayIndex = Math.floor(
                        (currentDate.getTime() - currentWeekStart.getTime()) /
                        (24 * 60 * 60 * 1000)
                      );
                      const rect = calendarRef.current
                        ?.querySelector('.calendar-content')
                        ?.getBoundingClientRect();
                      if (!rect) return;
                      const relativeY =
                        e.clientY -
                        rect.top +
                        (
                          calendarRef.current?.querySelector(
                            '.calendar-content'
                          ) as HTMLElement
                        )?.scrollTop || 0;
                      const clickedHour = FIRST_HOUR + relativeY / HOUR_HEIGHT;
                      handleCreateStart(e, currentDayIndex, clickedHour);
                    }}
                    onDragOver={handleDragOver}
                    onDrop={e => {
                      const rect = calendarRef.current
                        ?.querySelector('.calendar-content')
                        ?.getBoundingClientRect();
                      if (!rect) return;
                      const relativeY =
                        e.clientY -
                        rect.top +
                        (
                          calendarRef.current?.querySelector(
                            '.calendar-content'
                          ) as HTMLElement
                        )?.scrollTop || 0;
                      const dropHour = Math.floor(FIRST_HOUR + relativeY / HOUR_HEIGHT);
                      handleDrop(e, currentDate, dropHour);
                    }}
                  />
                ))}

                {/* Bottom boundary */}
                <div className="h-3 border-t border-gray-200 dark:border-gray-700 relative">
                  <div className="absolute -top-2.5 -left-9 text-[12px] text-gray-500 dark:text-gray-400">
                    00.00
                  </div>
                </div>

                {/* Event layer */}
                <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                  {currentDayEvents
                    .filter(event => !event.allDay)
                    .map(event => {
                      const eventLayout = eventLayouts.get(event.id);
                      return (
                        <CalendarEvent
                          key={event.id}
                          event={event}
                          layout={eventLayout}
                          isDayView={true}
                          calendarRef={calendarRef}
                          isBeingDragged={
                            isDragging &&
                            (dragState as WeekDayDragState)?.eventId ===
                            event.id &&
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
                          detailPanelEventId={detailPanelEventId}
                          onDetailPanelToggle={(eventId: string | null) =>
                            setDetailPanelEventId(eventId)
                          }
                          selectedEventId={selectedEvent?.id ?? null}
                          onEventSelect={(eventId: string | null) => {
                            const evt = events.find(e => e.id === eventId);
                            setSelectedEvent(evt || null);
                          }}
                          customDetailPanelContent={customDetailPanelContent}
                          customEventDetailDialog={customEventDetailDialog}
                          app={app}
                        />
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Right control panel - 30% */}
      <div
        className={`hidden md:block flex-none ${switcherMode === 'buttons' ? '' : ''} w-[30%] bg-white dark:bg-gray-900`}
      >
        <div className={`${flexCol} h-full`}>
          {/* Mini calendar */}
          <div className={miniCalendarContainer}>
            <div>
              <div className="flex items-center justify-end gap-2">
                <div
                  className={headerContainer}
                  style={{ position: 'relative' }}
                >
                  <div>
                    <h1 className={headerTitle}>&nbsp;</h1>
                  </div>
                </div>
                <TodayBox
                  handlePreviousMonth={() => app.goToPrevious()}
                  handleNextMonth={() => app.goToNext()}
                  handleToday={() => app.goToToday()}
                />
              </div>
              <MiniCalendar
                visibleMonth={visibleMonth}
                currentDate={currentDate}
                showHeader={true}
                onMonthChange={handleMonthChange}
                onDateSelect={handleDateSelect}
              />
            </div>
          </div>

          {/* Event details area */}
          <div className={`flex-1 ${p4} overflow-y-auto`}>
            <h3 className={`${textLg} font-semibold ${mb3}`}>
              {currentDate.toLocaleDateString(locale, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h3>

            {currentDayEvents.length === 0 ? (
              <p className={`${textGray500} ${textSm}`}>
                {t('noEvents')}
              </p>
            ) : (
              <div className="space-y-2">
                {currentDayEvents.map(event => (
                  <div
                    key={event.id}
                    className={`
                      ${p2} rounded border-l-4 cursor-pointer transition-colors
                      ${selectedEvent?.id === event.id ? 'bg-primary/10 border-primary' : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'}
                      hover:bg-gray-100 dark:hover:bg-gray-700
                    `}
                    style={{
                      borderLeftColor: getLineColor(event.calendarId || 'blue'),
                    }}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className={`font-medium ${textSm}`}>{event.title}</div>
                    {!event.allDay && (
                      <div className={`${textXs} ${textGray600}`}>
                        {formatTime(extractHourFromDate(event.start))} -{' '}
                        {formatTime(getEventEndHour(event))}
                      </div>
                    )}
                    {event.allDay && (
                      <div className={`${textXs} ${textGray600}`}>{t('allDay')}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;