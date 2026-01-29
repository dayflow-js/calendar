import React, { useMemo } from 'react';
import { Event, CalendarApp } from '@/types';
import { VirtualWeekItem } from '@/types/monthView';
import { temporalToDate } from '@/utils/temporal';
import { useLocale } from '@/locale';
import { analyzeMultiDayEventsForWeek } from '../monthView/util';

export interface MultiDayEventSegment {
  id: string;
  originalEventId: string;
  event: Event;
  startDayIndex: number;
  endDayIndex: number;
  segmentType: 'start' | 'middle' | 'end' | 'single' | 'start-week-end' | 'end-week-start';
  totalDays: number;
  segmentIndex: number;
  isFirstSegment: boolean;
  isLastSegment: boolean;
  yPosition?: number;
}

interface YearWeekComponentProps {
  currentMonth: string;
  currentYear: number;
  item: VirtualWeekItem;
  weekHeight: number;
  events: Event[];
  onSelectDate?: (date: Date) => void;
  app: CalendarApp;
}

const BAR_HEIGHT = 4;
const BAR_SPACING = 2;
const DATE_LABEL_HEIGHT = 16;

const organizeMultiDaySegments = (multiDaySegments: MultiDayEventSegment[]) => {
  const sortedSegments = [...multiDaySegments].sort((a, b) => {
    const aDays = a.endDayIndex - a.startDayIndex + 1;
    const bDays = b.endDayIndex - b.startDayIndex + 1;
    if (aDays !== bDays) return bDays - aDays;
    return a.startDayIndex - b.startDayIndex;
  });

  const layers: MultiDayEventSegment[][] = [];
  sortedSegments.forEach(segment => {
    let layerIndex = 0;
    while (true) {
      if (!layers[layerIndex]) {
        layers[layerIndex] = [];
        layers[layerIndex].push(segment);
        break;
      }
      const hasConflict = layers[layerIndex].some(existing => 
        !(segment.endDayIndex < existing.startDayIndex || segment.startDayIndex > existing.endDayIndex)
      );
      if (!hasConflict) {
        layers[layerIndex].push(segment);
        break;
      }
      layerIndex++;
    }
  });
  return layers;
};

const YearWeekComponent = React.memo<YearWeekComponentProps>(({
  currentMonth,
  currentYear,
  item,
  weekHeight,
  events,
  onSelectDate,
  app
}) => {
  const { getMonthLabels, locale } = useLocale();
  const { weekData } = item;
  
  // Reuse logic from WeekComponent to process events
  const constructedRenderEvents = useMemo(() => {
    // Simplified version of constructRenderEvents
    // We assume events are already valid or close to it
    // We just need to filter them for the day rendering
    return events;
  }, [events]);

  const multiDaySegments = useMemo(
    () => analyzeMultiDayEventsForWeek(events, weekData.startDate),
    [events, weekData.startDate]
  );

  const organizedMultiDaySegments = useMemo(
    () => organizeMultiDaySegments(multiDaySegments),
    [multiDaySegments]
  );

  // Calculate max bars we can show
  const maxBars = Math.floor((weekHeight - DATE_LABEL_HEIGHT) / (BAR_HEIGHT + BAR_SPACING));

      const getEventColor = (event: Event) => {
        const calendarId = event.calendarId;
        if (!calendarId) return '#3b82f6';
        // Optimization: we could pass a map of colors instead of searching every time
        // But for now this is safe
        const calendars = app.getCalendars();
        const calendar = calendars.find(c => c.id === calendarId);
        return calendar?.colors.eventColor || '#3b82f6';
      };
  
      const renderDayCell = (day: (typeof weekData.days)[0], dayIndex: number) => {
        const isFirstDayOfMonth = day.date.getDate() === 1;
        const monthLabel = day.date.toLocaleDateString(locale, { month: 'short' }).toUpperCase();
        
        const dayEvents = constructedRenderEvents.filter(e => {
          const start = temporalToDate(e.start);
          const end = temporalToDate(e.end || e.start);
          const isMulti = start.toDateString() !== end.toDateString();
          if (isMulti) return false;
          return start.toDateString() === day.date.toDateString();
        });
  
        return (
          <div
            key={`day-${day.date.getTime()}`}
            className={`
              relative flex flex-col border-r border-gray-100 dark:border-gray-800 last:border-r-0
              ${isFirstDayOfMonth ? 'border-l-2 border-l-gray-300 dark:border-l-gray-600' : ''}
              cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800
            `}
            style={{ height: weekHeight }}
            onClick={() => onSelectDate?.(day.date)}
          >
            <div className="flex items-center px-1 h-[16px] gap-1">
               <span className={`text-[10px] ${day.isToday ? 'bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center' : 'text-gray-500'}`}>
                 {day.day}
               </span>
               {isFirstDayOfMonth && (
                  <span className="text-[10px] font-bold text-gray-500 leading-none">
                    {monthLabel}
                  </span>
               )}
            </div>
            
            <div className="flex-1 px-[2px] relative overflow-hidden">
                 {dayEvents.slice(0, maxBars).map((event, i) => (
                   <div 
                     key={event.id}
                     className="w-full rounded-[1px] mb-[2px]"
                     style={{ 
                       height: `${BAR_HEIGHT}px`,
                       backgroundColor: getEventColor(event),
                       marginTop: `${i * (BAR_HEIGHT + BAR_SPACING)}px`
                     }}
                   />
                 ))}
            </div>
          </div>
        );
      };
  return (
    <div className="relative border-b border-gray-100 dark:border-gray-800" style={{ height: weekHeight }}>
      <div className="grid grid-cols-7 h-full">
        {weekData.days.map((day, index) => renderDayCell(day, index))}
      </div>
      
      {/* Multi-day overlay */}
      {organizedMultiDaySegments.length > 0 && (
        <div 
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: `${DATE_LABEL_HEIGHT}px`, bottom: 0 }}
        >
           {organizedMultiDaySegments.map((layer, layerIndex) => {
             if (layerIndex >= maxBars) return null; // Clip if too many
             return (
               <div key={`layer-${layerIndex}`} className="absolute inset-0">
                 {layer.map(segment => {
                    const startPercent = (segment.startDayIndex / 7) * 100;
                    const widthPercent = ((segment.endDayIndex - segment.startDayIndex + 1) / 7) * 100;
                    return (
                      <div
                        key={segment.id}
                        className="absolute h-[4px] rounded-[1px]"
                        style={{
                          left: `${startPercent}%`,
                          width: `${widthPercent}%`,
                          top: `${layerIndex * (BAR_HEIGHT + BAR_SPACING)}px`,
                          backgroundColor: getEventColor(segment.event),
                          marginLeft: '1px',
                          marginRight: '1px',
                          opacity: 0.8
                        }}
                      />
                    );
                 })}
               </div>
             );
           })}
        </div>
      )}
    </div>
  );
});

YearWeekComponent.displayName = 'YearWeekComponent';

export default YearWeekComponent;
