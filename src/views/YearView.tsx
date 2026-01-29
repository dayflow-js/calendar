import React, { useMemo, useRef, useEffect, useState } from 'react';
import { CalendarApp } from '@/core';
import { useLocale } from '@/locale';
import { Event, ViewType, MonthEventDragState } from '@/types';
import { temporalToDate } from '@/utils/temporal';
import ViewHeader from '@/components/common/ViewHeader';
import CalendarEvent from '@/components/calendarEvent';
import { useDragForView } from '@/plugins/dragPlugin';
import {
  monthViewContainer,
  scrollContainer,
} from '@/styles/classNames';

interface YearViewProps {
  app: CalendarApp;
  calendarRef: React.RefObject<HTMLDivElement>;
}

interface YearDayCellProps {
  date: Date;
  events: Event[];
  isToday: boolean;
  locale: string;
  onSelectDate: (date: Date) => void;
  app: CalendarApp;
  calendarRef: React.RefObject<HTMLDivElement>;
  onMoveStart?: (e: React.MouseEvent | React.TouchEvent, event: Event) => void;
  dragState: MonthEventDragState;
  isDragging: boolean;
  selectedEventId: string | null;
  onEventSelect: (eventId: string | null) => void;
  onDetailPanelToggle: (eventId: string | null) => void;
  detailPanelEventId: string | null;
}

const YearDayCell: React.FC<YearDayCellProps> = React.memo(({
  date,
  events,
  isToday,
  locale,
  onSelectDate,
  app,
  calendarRef,
  onMoveStart,
  dragState,
  isDragging,
  selectedEventId,
  onEventSelect,
  onDetailPanelToggle,
  detailPanelEventId,
}) => {
  const day = date.getDate();
  const isFirstDay = day === 1;
  const monthLabel = date.toLocaleDateString(locale, { month: 'short' }).toUpperCase();
  
  // Calculate max events to show (approximate based on cell size)
  // For Year view, we keep it tight.
  const MAX_EVENTS = 3;

  return (
    <div
      className={`
        relative flex flex-col border border-gray-100 dark:border-gray-800
        ${isFirstDay ? 'border-l-2 border-l-gray-300 dark:border-l-gray-600' : ''}
        cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800
        overflow-hidden bg-white dark:bg-gray-900
      `}
      style={{ aspectRatio: '1/1' }}
      onClick={() => onSelectDate(date)}
      // Enable drop target for drag plugin
      data-date={date.toISOString().split('T')[0]} 
    >
      <div className="flex items-center px-1 py-1 gap-1 shrink-0">
        <span
          className={`text-[10px] font-medium ${isToday
            ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center'
            : 'text-gray-700 dark:text-gray-300'
            }`}
        >
          {day}
        </span>
        {isFirstDay && (
          <span className="text-[10px] font-bold text-gray-500 leading-none">
            {monthLabel}
          </span>
        )}
      </div>

      <div className="flex-1 px-1 flex flex-col gap-[1px] overflow-hidden">
        {events.slice(0, MAX_EVENTS).map((event) => (
          <CalendarEvent
            key={event.id}
            event={event}
            app={app}
            isMonthView={true}
            calendarRef={calendarRef}
            hourHeight={0}
            firstHour={0}
            onEventUpdate={(updated) => app.updateEvent(updated.id, updated)}
            onEventDelete={(id) => app.deleteEvent(id)}
            hideTime={true}
            onMoveStart={onMoveStart}
            isBeingDragged={
              isDragging &&
              dragState.eventId === event.id &&
              dragState.mode === 'move'
            }
            selectedEventId={selectedEventId}
            onEventSelect={onEventSelect}
            detailPanelEventId={detailPanelEventId}
            onDetailPanelToggle={onDetailPanelToggle}
          />
        ))}
        {events.length > MAX_EVENTS && (
          <div className="text-[9px] text-gray-400 pl-1 leading-tight">
            +{events.length - MAX_EVENTS}
          </div>
        )}
      </div>
    </div>
  );
});

YearDayCell.displayName = 'YearDayCell';

const YearView: React.FC<YearViewProps> = ({
  app,
  calendarRef,
}) => {
  const { locale, getMonthLabels } = useLocale();
  const currentDate = app.getCurrentDate();
  const currentYear = currentDate.getFullYear();
  const rawEvents = app.getEvents();
  const scrollElementRef = useRef<HTMLDivElement>(null);
  
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [detailPanelEventId, setDetailPanelEventId] = useState<string | null>(null);

  // Drag and Drop Hook
  const {
    handleMoveStart,
    dragState,
    isDragging,
  } = useDragForView(app, {
    calendarRef,
    viewType: ViewType.YEAR,
    onEventsUpdate: (updateFunc) => {
      const newEvents = updateFunc(rawEvents);
      newEvents.forEach(newEvent => {
        const oldEvent = rawEvents.find(e => e.id === newEvent.id);
        if (oldEvent && (oldEvent.start !== newEvent.start || oldEvent.end !== newEvent.end)) {
          app.updateEvent(newEvent.id, newEvent);
        }
      });
    },
    currentWeekStart: new Date(),
    events: rawEvents,
    onEventCreate: () => {},
    onEventEdit: () => {},
  });

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

  // Filter events for the current year
  const yearEvents = useMemo(() => {
    // Simple filter: Event must overlap with the current year
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    return rawEvents.filter(event => {
       if (!event.start) return false;
       const s = temporalToDate(event.start);
       const e = event.end ? temporalToDate(event.end) : s;
       return s <= yearEnd && e >= yearStart;
    });
  }, [rawEvents, currentYear]);

  // Map events to days for faster rendering
  // Note: This is a heavy operation, memoize carefully.
  // For < 2000 events and 365 days, it's roughly 700k ops worst case, but realistically much less.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    
    // Initialize map keys? No, just populate.
    
    yearEvents.forEach(event => {
      const startFull = temporalToDate(event.start);
      const endFull = event.end ? temporalToDate(event.end) : startFull;
      
      // Clamp to current year
      let current = new Date(startFull);
      if (current.getFullYear() < currentYear) current = new Date(currentYear, 0, 1);
      
      const endLoop = new Date(endFull);
      if (endLoop.getFullYear() > currentYear) endLoop.setDate(31); // Optimization: just loop until end of year if needed, but handled by date comparison
      
      // We only care about date part
      current.setHours(0,0,0,0);
      const loopEndVal = endLoop.getTime();

      // Safety break
      let safety = 0;
      while (current.getTime() <= loopEndVal && current.getFullYear() === currentYear && safety < 370) {
         const key = current.toDateString();
         if (!map.has(key)) map.set(key, []);
         map.get(key)!.push(event);
         
         current.setDate(current.getDate() + 1);
         safety++;
      }
    });
    return map;
  }, [yearEvents, currentYear]);

  const getCustomTitle = () => {
     const isAsianLocale = locale.startsWith('zh') || locale.startsWith('ja');
     return isAsianLocale ? `${currentYear}年` : `${currentYear}`;
  };

  const today = new Date();
  today.setHours(0,0,0,0);

  return (
    <div className={monthViewContainer}>
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
        className={`${scrollContainer} p-4`}
        style={{
          overflow: 'hidden auto',
        }}
      >
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
            gap: '1px',
            width: '100%',
          }}
        >
          {yearDays.map((date) => {
             const key = date.toDateString();
             const dayEvents = eventsByDay.get(key) || [];
             const isToday = date.getTime() === today.getTime();
             
             return (
               <YearDayCell 
                 key={date.getTime()}
                 date={date}
                 events={dayEvents}
                 isToday={isToday}
                 locale={locale}
                 onSelectDate={(d) => {
                   app.selectDate(d);
                   app.changeView(ViewType.DAY);
                 }}
                 app={app}
                 calendarRef={calendarRef}
                 onMoveStart={handleMoveStart}
                 dragState={dragState as MonthEventDragState}
                 isDragging={isDragging}
                 selectedEventId={selectedEventId}
                 onEventSelect={setSelectedEventId}
                 onDetailPanelToggle={setDetailPanelEventId}
                 detailPanelEventId={detailPanelEventId}
               />
             );
          })}
        </div>
      </div>
    </div>
  );
};

export default YearView;

