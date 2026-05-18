import { memo } from 'preact/compat';
import { useMemo } from 'preact/hooks';

import { Event, ICalendarApp } from '@/types';
import { getTodayInTimeZone } from '@/utils';

import { FixedWeekMonthData, MonthEventSegment } from './utils';
import { YearEventBar } from './YearEventBar';

interface StaticEventsLayerProps {
  segments: MonthEventSegment[];
  totalColumns: number;
  app: ICalendarApp;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string, segmentId: string) => void;
  onMoveStart?: (e: MouseEvent | TouchEvent, event: Event) => void;
  onContextMenuEvent?: (e: MouseEvent, event: Event) => void;
  isDraggable: boolean;
}

// Renders the non-dragged events for a month using lightweight YearEventBars.
// every drag cell crossing.
const StaticEventsLayer = memo(
  ({
    segments,
    totalColumns,
    app,
    selectedEventId,
    onSelectEvent,
    onMoveStart,
    onContextMenuEvent,
    isDraggable,
  }: StaticEventsLayerProps) => (
    <>
      {segments.map(segment => (
        <YearEventBar
          key={segment.id}
          event={segment.event}
          segment={segment}
          columnsPerRow={totalColumns}
          isSelected={selectedEventId === segment.event.id}
          isBeingDragged={false}
          isDraggable={isDraggable}
          app={app}
          onSelect={onSelectEvent}
          onMoveStart={onMoveStart}
          onContextMenu={onContextMenuEvent}
        />
      ))}
    </>
  )
);

(StaticEventsLayer as { displayName?: string }).displayName =
  'FixedWeekStaticEventsLayer';

interface FixedWeekMonthRowProps {
  monthData: FixedWeekMonthData;
  startOfWeek: number;
  totalColumns: number;
  app: ICalendarApp;
  excludedEventId: string | null;
  isDragging: boolean;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string, segmentId: string) => void;
  onMoveStart?: (e: MouseEvent | TouchEvent, event: Event) => void;
  onContextMenuEvent?: (e: MouseEvent, event: Event) => void;
  onSelectDate: (date: Date) => void;
  onCreateStart?: (e: MouseEvent | TouchEvent, targetDate: Date) => void;
  onContextMenu: (e: MouseEvent, date: Date) => void;
  appTimeZone?: string;
  isDraggable: boolean;
}

export const FixedWeekMonthRow = memo(
  ({
    monthData,
    startOfWeek,
    totalColumns,
    app,
    excludedEventId,
    isDragging,
    selectedEventId,
    onSelectEvent,
    onMoveStart,
    onContextMenuEvent,
    onSelectDate,
    onCreateStart,
    onContextMenu,
    appTimeZone,
    isDraggable,
  }: FixedWeekMonthRowProps) => {
    const today = useMemo(() => {
      const now = getTodayInTimeZone(appTimeZone);
      now.setHours(0, 0, 0, 0);
      return now;
    }, [appTimeZone]);

    const staticSegments = useMemo(() => {
      if (!excludedEventId) return monthData.eventSegments;
      return monthData.eventSegments.filter(
        segment => segment.event.id !== excludedEventId
      );
    }, [monthData.eventSegments, excludedEventId]);

    return (
      <div
        className='df-year-fixed-month-row'
        style={{
          minHeight: `${monthData.minHeight}px`,
          transition: 'min-height 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className='df-year-fixed-background-grid'
          style={{
            gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))`,
          }}
        >
          {monthData.days.map((date, dayIndex) => {
            const dayOfWeek = (dayIndex + startOfWeek) % 7;
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            if (!date) {
              return (
                <div
                  key={`empty-${monthData.monthIndex}-${dayIndex}`}
                  className='df-year-fixed-empty-cell'
                  data-weekend={isWeekend ? 'true' : 'false'}
                />
              );
            }

            const isToday = date.getTime() === today.getTime();
            const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

            return (
              <div
                key={date.getTime()}
                data-date={dateString}
                className='df-year-fixed-day-cell'
                data-dragging={isDragging ? 'true' : 'false'}
                data-weekend={isWeekend ? 'true' : 'false'}
                onClick={() => onSelectDate(date)}
                onDblClick={e => onCreateStart?.(e, date)}
                onContextMenu={e => onContextMenu(e, date)}
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

        {staticSegments.length > 0 && (
          <div className='df-year-fixed-event-layer' style={{ top: 20 }}>
            <div className='df-year-fixed-event-layer-inner'>
              <StaticEventsLayer
                segments={staticSegments}
                totalColumns={totalColumns}
                app={app}
                selectedEventId={selectedEventId}
                onSelectEvent={onSelectEvent}
                onMoveStart={onMoveStart}
                onContextMenuEvent={onContextMenuEvent}
                isDraggable={isDraggable}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

(FixedWeekMonthRow as { displayName?: string }).displayName =
  'FixedWeekMonthRow';
