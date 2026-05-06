import { ComponentChild, RefObject } from 'preact';
import { useRef } from 'preact/hooks';

import CalendarEvent from '@/components/calendarEvent';
import {
  monthDayCell,
  monthDateNumberContainer,
  monthDateNumber,
  monthMoreEvents,
  cn,
} from '@/styles/classNames';
import { Event, ICalendarApp, MonthEventDragState, ViewType } from '@/types';
import { DayData } from '@/types/calendar';
import { getWeekNumber } from '@/utils';
import { extractHourFromDate } from '@/utils/helpers';

import {
  MonthDayLayoutData,
  MultiDayEventSegment,
  createDateString,
} from './util';

interface WeekDayCellProps {
  app: ICalendarApp;
  appTimeZone?: string;
  calendarRef: RefObject<HTMLDivElement>;
  currentMonth: string;
  currentYear: number;
  useEventDetailPanel?: boolean;
  day: DayData;
  dayIndex: number;
  dayLayout: MonthDayLayoutData;
  detailPanelEventId?: string | null;
  dragState: MonthEventDragState;
  enableTouch?: boolean;
  hasScrollbarSpace: boolean;
  isDragging: boolean;
  locale: string;
  moreLabel: string;
  newlyCreatedEventId: string | null;
  onChangeView?: (view: ViewType) => void;
  onContextMenu: (e: MouseEvent, date: Date) => void;
  onCreateStart?: (e: MouseEvent | TouchEvent, targetDate: Date) => void;
  onDetailPanelOpen: () => void;
  onDetailPanelToggle?: (eventId: string | null) => void;
  onEventDelete: (eventId: string) => void;
  onEventLongPress?: (eventId: string) => void;
  onEventSelect?: (eventId: string | null) => void;
  onEventUpdate: (updatedEvent: Event) => void;
  onMoreEventsClick?: (date: Date) => void;
  onMoveStart?: (e: MouseEvent | TouchEvent, event: Event) => void;
  onResizeStart?: (
    e: MouseEvent | TouchEvent,
    event: Event,
    direction: string
  ) => void;
  onSelectDate?: (date: Date) => void;
  onGridDateClick?: (date: Date, dayEvents: Event[]) => void;
  onGridDateDoubleClick?: (
    e: MouseEvent | TouchEvent,
    date: Date,
    dayEvents: Event[]
  ) => void;
  organizedMultiDaySegments: MultiDayEventSegment[][];
  overlayVisibleLayerCount: number;
  screenSize: 'mobile' | 'tablet' | 'desktop';
  selectedEventId?: string | null;
  showWeekNumbers?: boolean;
  totalSlotsNeeded: number;
  weekHeightPx: string;
  eventHeight?: number;
}

const WeekDayCell = ({
  app,
  appTimeZone,
  calendarRef,
  currentMonth,
  currentYear,
  useEventDetailPanel,
  day,
  dayIndex,
  dayLayout,
  detailPanelEventId,
  dragState,
  enableTouch,
  hasScrollbarSpace,
  isDragging,
  locale,
  moreLabel,
  newlyCreatedEventId,
  onChangeView,
  onContextMenu,
  onCreateStart,
  onDetailPanelOpen,
  onDetailPanelToggle,
  onEventDelete,
  onEventLongPress,
  onEventSelect,
  onEventUpdate,
  onMoreEventsClick,
  onMoveStart,
  onResizeStart,
  onSelectDate,
  onGridDateClick,
  onGridDateDoubleClick,
  organizedMultiDaySegments,
  overlayVisibleLayerCount,
  screenSize,
  selectedEventId,
  showWeekNumbers,
  totalSlotsNeeded,
  weekHeightPx,
  eventHeight = 16,
}: WeekDayCellProps) => {
  const rowSpacing = eventHeight + 1;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const dayMonthName = day.date.toLocaleDateString(locale, {
    month:
      locale.startsWith('zh') || locale.startsWith('ja') ? 'short' : 'long',
  });

  const belongsToCurrentMonth =
    dayMonthName === currentMonth && day.year === currentYear;

  const {
    hasMore: hasMoreEvents,
    limit: displaySlotLimit,
    timedEventsOnly,
    gapLayers,
    occupiedLayers,
    maxOccupiedLayer,
    segmentIsHidden,
  } = dayLayout;

  let hiddenSegmentCount = 0;
  organizedMultiDaySegments.slice(displaySlotLimit).forEach(layer => {
    layer.forEach(segment => {
      if (
        segment.startDayIndex <= dayIndex &&
        segment.endDayIndex >= dayIndex
      ) {
        hiddenSegmentCount++;
      }
    });
  });

  organizedMultiDaySegments.slice(0, displaySlotLimit).forEach(layer => {
    layer.forEach(segment => {
      if (
        segment.startDayIndex <= dayIndex &&
        segment.endDayIndex >= dayIndex &&
        segmentIsHidden.has(segment.id)
      ) {
        hiddenSegmentCount++;
      }
    });
  });

  const gapsWithinLimit = gapLayers.filter(
    layer => layer < displaySlotLimit
  ).length;
  const hiddenSegmentsInVisibleLayers = organizedMultiDaySegments
    .slice(0, displaySlotLimit)
    .filter(layer =>
      layer.some(
        segment =>
          segment.startDayIndex <= dayIndex &&
          segment.endDayIndex >= dayIndex &&
          segmentIsHidden.has(segment.id)
      )
    ).length;

  const slotsAfterMultiDayWithinLimit = Math.max(
    0,
    displaySlotLimit - Math.max(maxOccupiedLayer + 1, 0)
  );

  const displayCount = Math.min(
    timedEventsOnly.length,
    gapsWithinLimit +
      slotsAfterMultiDayWithinLimit +
      hiddenSegmentsInVisibleLayers
  );

  const displayEvents = timedEventsOnly.slice(0, displayCount);
  const hiddenEventsCount =
    hiddenSegmentCount + (timedEventsOnly.length - displayCount);
  const maskHiddenOverlayRows =
    hasMoreEvents && overlayVisibleLayerCount > displaySlotLimit;
  const hiddenOverlayHeight =
    (overlayVisibleLayerCount - displaySlotLimit) * rowSpacing;

  const dragEventId =
    isDragging && dragState.eventId ? dragState.eventId : null;
  const dragEventInDisplay = dragEventId
    ? displayEvents.find(event => event.id === dragEventId)
    : null;
  const dragEventInTimedOnly =
    dragEventId && !dragEventInDisplay
      ? timedEventsOnly.find(event => event.id === dragEventId)
      : null;
  const orderedDisplayEvents = dragEventInDisplay
    ? [
        dragEventInDisplay,
        ...displayEvents.filter(event => event.id !== dragEventId),
      ]
    : dragEventInTimedOnly && displayEvents.length > 0
      ? [dragEventInTimedOnly, ...displayEvents.slice(0, -1)]
      : dragEventInTimedOnly
        ? [dragEventInTimedOnly]
        : displayEvents;

  const renderElements: ComponentChild[] = [];
  let timedEventIndex = 0;
  const slotsToRender = Math.min(displaySlotLimit, totalSlotsNeeded);

  for (let slot = 0; slot < slotsToRender; slot++) {
    if (
      occupiedLayers.has(slot) &&
      !organizedMultiDaySegments[slot].some(
        segment =>
          segment.startDayIndex <= dayIndex &&
          segment.endDayIndex >= dayIndex &&
          segmentIsHidden.has(segment.id)
      )
    ) {
      renderElements.push(
        <div
          key={`placeholder-layer-${slot}-${day.date.getTime()}`}
          className='df-shrink-0'
          style={{
            height: `${rowSpacing}px`,
            minHeight: `${rowSpacing}px`,
          }}
        />
      );
    } else if (timedEventIndex < orderedDisplayEvents.length) {
      const event = orderedDisplayEvents[timedEventIndex];

      renderElements.push(
        <CalendarEvent
          key={`${event.id}-${event.day}-${extractHourFromDate(event.start)}-${timedEventIndex}`}
          event={event}
          isAllDay={!!event.allDay}
          viewType={ViewType.MONTH}
          isBeingDragged={
            isDragging &&
            dragState.eventId === event.id &&
            dragState.mode === 'move'
          }
          calendarRef={calendarRef}
          hourHeight={72}
          firstHour={0}
          onEventUpdate={onEventUpdate}
          onEventDelete={onEventDelete}
          onMoveStart={onMoveStart}
          onResizeStart={onResizeStart}
          onDetailPanelOpen={onDetailPanelOpen}
          onEventSelect={onEventSelect}
          onEventLongPress={onEventLongPress}
          newlyCreatedEventId={newlyCreatedEventId}
          selectedEventId={selectedEventId}
          detailPanelEventId={detailPanelEventId}
          onDetailPanelToggle={onDetailPanelToggle}
          useEventDetailPanel={useEventDetailPanel}
          app={app}
          isMobile={screenSize !== 'desktop'}
          enableTouch={enableTouch}
          appTimeZone={appTimeZone}
          monthEventHeight={eventHeight}
        />
      );
      timedEventIndex++;
    }
  }

  const dayEvents = [
    ...timedEventsOnly,
    ...organizedMultiDaySegments
      .flat()
      .filter(
        segment =>
          segment.startDayIndex <= dayIndex && segment.endDayIndex >= dayIndex
      )
      .map(segment => segment.event),
  ];

  return (
    <div
      key={`day-${day.date.getTime()}`}
      className={cn(monthDayCell, 'df-month-day-cell-surface')}
      style={{ height: weekHeightPx }}
      data-other-month={belongsToCurrentMonth ? 'false' : 'true'}
      data-trailing-border={
        dayIndex === 6 && !hasScrollbarSpace ? 'false' : 'true'
      }
      data-date={createDateString(day.date)}
      onClick={() => {
        if (!belongsToCurrentMonth) return;
        if (onGridDateClick) {
          onGridDateClick(day.date, dayEvents);
        } else {
          onSelectDate?.(day.date);
        }
      }}
      onDblClick={event => {
        if (onGridDateDoubleClick) {
          onGridDateDoubleClick(event, day.date, dayEvents);
        } else {
          onCreateStart?.(event, day.date);
        }
      }}
      onTouchStart={event => {
        if (screenSize !== 'mobile' && !enableTouch) return;
        const touch = event.touches[0];
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

        longPressTimerRef.current = setTimeout(() => {
          onCreateStart?.(event as unknown as TouchEvent, day.date);
          longPressTimerRef.current = null;
          if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
      }}
      onTouchMove={event => {
        if (longPressTimerRef.current && touchStartPosRef.current) {
          const dx = Math.abs(
            event.touches[0].clientX - touchStartPosRef.current.x
          );
          const dy = Math.abs(
            event.touches[0].clientY - touchStartPosRef.current.y
          );
          if (dx > 10 || dy > 10) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      }}
      onTouchEnd={() => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        touchStartPosRef.current = null;
      }}
      onContextMenu={event => onContextMenu(event, day.date)}
    >
      <div className={monthDateNumberContainer}>
        {showWeekNumbers && dayIndex === 0 && screenSize !== 'mobile' && (
          <span className='df-month-week-number'>
            {getWeekNumber(day.date)}
          </span>
        )}
        <span
          className={monthDateNumber}
          data-today={day.isToday ? 'true' : undefined}
          data-other-month={belongsToCurrentMonth ? undefined : 'true'}
        >
          {day.day === 1 && screenSize === 'desktop'
            ? day.date.toLocaleDateString(locale, {
                month: 'short',
                day: 'numeric',
              })
            : day.day}
        </span>
      </div>

      <div className='df-month-day-cell-content'>
        {maskHiddenOverlayRows && (
          <div
            className='df-month-day-cell-overlay-mask'
            style={{
              top: `${displaySlotLimit * rowSpacing}px`,
              height: `${hiddenOverlayHeight}px`,
            }}
          />
        )}
        {renderElements}

        {hasMoreEvents && (
          <div
            className={cn(monthMoreEvents, 'df-month-day-cell-more-events')}
            data-layout={screenSize === 'desktop' ? 'desktop' : 'mobile'}
            onClick={event => {
              event.stopPropagation();
              if (onMoreEventsClick) {
                onMoreEventsClick(day.date);
              } else {
                onSelectDate?.(day.date);
                onChangeView?.(ViewType.DAY);
              }
            }}
          >
            +{hiddenEventsCount}
            {screenSize === 'desktop' ? ` ${moreLabel}` : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeekDayCell;
