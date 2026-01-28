import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { CalendarApp } from '@/core';
import {
  MonthEventDragState,
  Event,
  ViewType,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
} from '@/types';
import { VirtualWeekItem } from '@/types/monthView';
import { temporalToDate } from '@/utils/temporal';
import { useLocale } from '@/locale';
import CalendarEvent from '../calendarEvent';
import { analyzeMultiDayEventsForWeek } from './util';
import { extractHourFromDate } from '@/utils/helpers';
import { logger } from '@/utils/logger';

export interface MultiDayEventSegment {
  id: string;
  originalEventId: string;
  event: Event;
  startDayIndex: number;
  endDayIndex: number;
  segmentType:
  | 'start'
  | 'middle'
  | 'end'
  | 'single'
  | 'start-week-end'
  | 'end-week-start';
  totalDays: number;
  segmentIndex: number;
  isFirstSegment: boolean;
  isLastSegment: boolean;
  yPosition?: number;
}

interface WeekComponentProps {
  currentMonth: string;
  currentYear: number;
  newlyCreatedEventId: string | null;
  screenSize: 'mobile' | 'tablet' | 'desktop';
  isScrolling: boolean;
  isDragging: boolean;
  item: VirtualWeekItem;
  weekHeight: number; // Use this instead of item.height to avoid sync issues
  events: Event[];
  dragState: MonthEventDragState;
  calendarRef: React.RefObject<HTMLDivElement>;
  onEventUpdate: (updatedEvent: Event) => void;
  onEventDelete: (eventId: string) => void;
  onMoveStart?: (
    e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.TouchEvent<HTMLDivElement>,
    event: Event
  ) => void;
  onCreateStart?: (e: React.MouseEvent | React.TouchEvent, targetDate: Date) => void;
  onResizeStart?: (
    e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.TouchEvent<HTMLDivElement>,
    event: Event,
    direction: string
  ) => void;
  onDetailPanelOpen: () => void;
  onMoreEventsClick?: (date: Date) => void;
  onChangeView?: (view: ViewType) => void;
  onSelectDate?: (date: Date) => void;
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string | null) => void;
  onEventLongPress?: (eventId: string) => void;
  detailPanelEventId?: string | null;
  onDetailPanelToggle?: (eventId: string | null) => void;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  onCalendarDrop?: (e: React.DragEvent, dropDate: Date, dropHour?: number, isAllDay?: boolean) => Event | null;
  onCalendarDragOver?: (e: React.DragEvent) => void;
  calendarSignature?: string;
  app: CalendarApp;
  enableTouch?: boolean;
}

// Constants
const ROW_HEIGHT = 16;
const ROW_SPACING = 17;
const MULTI_DAY_TOP_OFFSET = 33;
const MORE_TEXT_HEIGHT = 20; // Height reserved for the "+ x more" indicator

/**
 * Calculate how many single-day events can be shown inside a cell.
 * Ideal case: show 4 events plus the "+ x more" indicator.
 * When the height is limited, gradually reduce the number of events.
 */
const calculateMaxEventsToShow = (weekHeight: number): number => {
  // Reserve the top portion for the date label/multi-day layer offset
  const availableHeight = weekHeight - MULTI_DAY_TOP_OFFSET;

  if (availableHeight <= 0) {
    return 0;
  }

  const eventHeight = ROW_SPACING;
  const maxEventsWithoutCap = Math.floor(availableHeight / eventHeight);
  const cappedEvents = Math.max(0, Math.min(4, maxEventsWithoutCap));

  // If we're not limited by the hard cap of 4 events, ensure there's space for the "+ x more" line
  if (
    cappedEvents === maxEventsWithoutCap &&
    availableHeight - cappedEvents * eventHeight < MORE_TEXT_HEIGHT
  ) {
    return Math.max(0, cappedEvents - 1);
  }

  return cappedEvents;
};

// Organize multi-day event segments
const organizeMultiDaySegments = (multiDaySegments: MultiDayEventSegment[]) => {
  const sortedSegments = [...multiDaySegments].sort((a, b) => {
    const aDays = a.endDayIndex - a.startDayIndex + 1;
    const bDays = b.endDayIndex - b.startDayIndex + 1;

    if (a.startDayIndex > b.startDayIndex) {
      return 1; // a after b
    }

    if (aDays !== bDays) {
      return bDays - aDays; // Longer events first
    }

    return a.startDayIndex - b.startDayIndex; // Earlier start time first
  });

  // Assign Y positions to avoid conflicts
  const segmentsWithPosition: MultiDayEventSegment[] = [];

  sortedSegments.forEach(segment => {
    let yPosition = 0;
    let positionFound = false;

    while (!positionFound) {
      const hasConflict = segmentsWithPosition.some(existingSegment => {
        const yConflict =
          Math.abs((existingSegment.yPosition ?? 0) - yPosition) < ROW_HEIGHT;
        const timeConflict = !(
          segment.endDayIndex < existingSegment.startDayIndex ||
          segment.startDayIndex > existingSegment.endDayIndex
        );
        return yConflict && timeConflict;
      });

      if (!hasConflict) {
        positionFound = true;
      } else {
        yPosition += ROW_HEIGHT;
      }
    }

    segmentsWithPosition.push({ ...segment, yPosition });
  });

  // Convert to hierarchical structure
  const layers: MultiDayEventSegment[][] = [];

  segmentsWithPosition.forEach(segment => {
    const layerIndex = Math.floor((segment.yPosition ?? 0) / ROW_HEIGHT);

    if (!layers[layerIndex]) {
      layers[layerIndex] = [];
    }

    layers[layerIndex].push(segment);
  });

  // Sort each layer by start time
  layers.forEach(layer => {
    layer.sort((a, b) => a.startDayIndex - b.startDayIndex);
  });

  return layers;
};

// Build render event list (multi-day regular events will be rendered through segment, skipping here)
const constructRenderEvents = (events: Event[]): Event[] => {
  const renderEvents: Event[] = [];

  events.forEach(event => {
    // Ensure events have start and end fields
    if (!event.start || !event.end) {
      logger.warn('Event missing start or end date:', event);
      return; // Skip invalid events
    }

    const start = temporalToDate(event.start);
    const end = temporalToDate(event.end);
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    // For normal events, if the end time is midnight 00:00 and the duration is less than 24 hours,
    // the end date should be adjusted to the same day as the start date to avoid misidentifying as a multi-day event
    let adjustedEndDate = new Date(endDate);
    if (!event.allDay) {
      const endHasTime = end.getHours() !== 0 || end.getMinutes() !== 0 || end.getSeconds() !== 0;
      if (!endHasTime) {
        // The end time is 00:00:00, check the duration
        const durationMs = end.getTime() - start.getTime();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        if (durationMs > 0 && durationMs < ONE_DAY_MS) {
          // The duration is less than 24 hours, set the end date to the previous day
          adjustedEndDate = new Date(endDate);
          adjustedEndDate.setDate(adjustedEndDate.getDate() - 1);
        }
      }
    }

    // Check if it is a multi-day event (using the adjusted end date)
    const isMultiDay = startDate.toDateString() !== adjustedEndDate.toDateString();

    // Multi-day regular events: rendered through segment, skipping here
    if (isMultiDay && !event.allDay) {
      return;
    }

    // Multi-day all-day events: create event instances for each day (keeping old logic for all-day events)
    if (isMultiDay && event.allDay) {
      const current = new Date(start);
      while (current <= end) {
        const currentTemporal = Temporal.PlainDate.from({
          year: current.getFullYear(),
          month: current.getMonth() + 1,
          day: current.getDate(),
        });

        renderEvents.push({
          ...event,
          start: currentTemporal,
          end: currentTemporal,
          day: current.getDay(),
        });
        current.setDate(current.getDate() + 1);
      }
    } else {
      // Single-day events (all-day or regular)
      renderEvents.push({
        ...event,
        start: event.start,
        end: event.end,
        day: start.getDay(),
      });
    }
  });

  return renderEvents;
};

// Sort events
const sortDayEvents = (events: Event[]): Event[] => {
  return [...events].sort((a, b) => {
    // All-day events first
    if (a.allDay !== b.allDay) {
      return a.allDay ? -1 : 1;
    }

    // If both are all-day events, keep the original order
    if (a.allDay && b.allDay) return 0;

    // Non-all-day events sorted by start time
    return extractHourFromDate(a.start) - extractHourFromDate(b.start);
  });
};

// Create date string
const createDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WeekComponent = React.memo<WeekComponentProps>(
  ({
    currentMonth,
    currentYear,
    newlyCreatedEventId,
    screenSize,
    isScrolling,
    isDragging,
    item,
    weekHeight,
    events,
    dragState,
    calendarRef,
    onEventUpdate,
    onEventDelete,
    onMoveStart,
    onCreateStart,
    onResizeStart,
    onDetailPanelOpen,
    onMoreEventsClick,
    onChangeView,
    onSelectDate,
    selectedEventId,
    onEventSelect,
    onEventLongPress,
    detailPanelEventId,
    onDetailPanelToggle,
    customDetailPanelContent,
    customEventDetailDialog,
    onCalendarDrop,
    onCalendarDragOver,
    app,
    enableTouch,
  }) => {
    const { t, locale } = useLocale();
    const [shouldShowMonthTitle, setShouldShowMonthTitle] = useState(false);
    const hideTitleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

    // Calculate layout parameters once per week render
    const layoutParams = useMemo(() => {
      const availableHeight = weekHeight - MULTI_DAY_TOP_OFFSET;
      if (availableHeight <= 0) return { maxSlots: 0, maxSlotsWithMore: 0 };

      const hardCap = 4;
      const maxSlots = Math.min(hardCap, Math.floor(availableHeight / ROW_SPACING));

      const spaceForMore = availableHeight - MORE_TEXT_HEIGHT;
      const maxSlotsWithMore = Math.min(hardCap, Math.max(0, Math.floor(spaceForMore / ROW_SPACING)));

      return { maxSlots, maxSlotsWithMore };
    }, [weekHeight]);

    useEffect(() => {
      if (isScrolling) {
        setShouldShowMonthTitle(true);

        if (hideTitleTimeoutRef.current) {
          clearTimeout(hideTitleTimeoutRef.current);
          hideTitleTimeoutRef.current = null;
        }

        return () => {
          if (hideTitleTimeoutRef.current) {
            clearTimeout(hideTitleTimeoutRef.current);
            hideTitleTimeoutRef.current = null;
          }
        };
      }

      if (!shouldShowMonthTitle) {
        return;
      }

      hideTitleTimeoutRef.current = setTimeout(() => {
        setShouldShowMonthTitle(false);
        hideTitleTimeoutRef.current = null;
      }, 100);

      return () => {
        if (hideTitleTimeoutRef.current) {
          clearTimeout(hideTitleTimeoutRef.current);
          hideTitleTimeoutRef.current = null;
        }
      };
    }, [isScrolling, shouldShowMonthTitle]);

    const { weekData } = item;
    const firstDayOfMonth = weekData.days.find(day => day.day === 1);

    // Use the weekHeight prop instead of item.height to avoid jumps from virtual scroll sync delays
    const weekHeightPx = `${weekHeight}px`;

    // Analyze multi-day events for the current week
    const multiDaySegments = useMemo(
      () => analyzeMultiDayEventsForWeek(events, weekData.startDate),
      [events, weekData.startDate]
    );

    // Build render events
    const constructedRenderEvents = useMemo(
      () => constructRenderEvents(events),
      [events]
    );

    // Organize multi-day event segments
    const organizedMultiDaySegments = useMemo(
      () => organizeMultiDaySegments(multiDaySegments),
      [multiDaySegments]
    );

    const dayLayerCounts = useMemo(() => {
      const counts = Array(7).fill(0);

      organizedMultiDaySegments.forEach((layer, layerIndex) => {
        layer.forEach(segment => {
          for (let dayIndex = segment.startDayIndex; dayIndex <= segment.endDayIndex; dayIndex++) {
            counts[dayIndex] = Math.max(counts[dayIndex], layerIndex + 1);
          }
        });
      });

      return counts;
    }, [organizedMultiDaySegments]);

    // Calculate the height of the multi-day event area
    const multiDayAreaHeight = useMemo(
      () => Math.max(0, organizedMultiDaySegments.length * ROW_SPACING),
      [organizedMultiDaySegments]
    );

    // Get events for a specific date
    const getEventsForDay = (dayDate: Date): Event[] => {
      return constructedRenderEvents.filter(event => {
        if (!event.start || !event.end) {
          return (
            temporalToDate(event.start).toDateString() ===
            dayDate.toDateString()
          );
        }

        const startDate = temporalToDate(event.start);
        const endDate = temporalToDate(event.end);

        // For normal events, check if they end at midnight and have a duration less than 24 hours
        if (!event.allDay) {
          const endHasTime = endDate.getHours() !== 0 || endDate.getMinutes() !== 0 || endDate.getSeconds() !== 0;
          if (!endHasTime) {
            const durationMs = endDate.getTime() - startDate.getTime();
            const ONE_DAY_MS = 24 * 60 * 60 * 1000;
            if (durationMs > 0 && durationMs < ONE_DAY_MS) {
              // Only match start date, not end date
              return startDate.toDateString() === dayDate.toDateString();
            }
          }
        }

        return (
          startDate.toDateString() === dayDate.toDateString() ||
          endDate.toDateString() === dayDate.toDateString()
        );
      });
    };

    // Render date cell
    const renderDayCell = (day: (typeof weekData.days)[0], dayIndex: number) => {
      // We need to parse currentMonth (localized string) back to month index, OR compare strings
      // Comparing localized month strings is safer than trying to parse back
      const dayMonthName = day.date.toLocaleDateString(locale, { month: (locale.startsWith('zh') || locale.startsWith('ja')) ? 'short' : 'long' });

      const belongsToCurrentMonth =
        dayMonthName === currentMonth &&
        day.year === currentYear;
      const dayEvents = getEventsForDay(day.date);
      const sortedEvents = sortDayEvents(dayEvents);

      const totalEvents = sortedEvents.length;
      let displayCount = 0;

      if (totalEvents <= layoutParams.maxSlots) {
        displayCount = totalEvents;
      } else {
        displayCount = layoutParams.maxSlotsWithMore;
      }

      const displayEvents = sortedEvents.slice(0, displayCount);
      const hiddenEventsCount = totalEvents - displayCount;
      const hasMoreEvents = hiddenEventsCount > 0;

      // Create render array and layer array
      const renderElements: React.JSX.Element[] = [];

      const placeholderCount = dayLayerCounts[dayIndex] ?? 0;
      for (let layerIndex = 0; layerIndex < placeholderCount; layerIndex++) {
        renderElements.push(
          <div
            key={`placeholder-layer-${layerIndex}-${day.date.getTime()}`}
            className="shrink-0"
            style={{
              height: `${ROW_SPACING}px`,
              minHeight: `${ROW_SPACING}px`,
            }}
          />
        );
      }

      displayEvents.forEach((event, index) => {
        const segment = organizedMultiDaySegments
          .flat()
          .find(seg => seg.originalEventId === event.id);

        if (event.allDay && segment) {
          return;
        } else {
          renderElements.push(
            <CalendarEvent
              key={`${event.id}-${event.day}-${extractHourFromDate(event.start)}-${index}`}
              event={event}
              isAllDay={!!event.allDay}
              isMonthView={true}
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
              customDetailPanelContent={customDetailPanelContent}
              customEventDetailDialog={customEventDetailDialog}
              app={app}
              isMobile={screenSize !== 'desktop'}
              enableTouch={enableTouch}
            />
          );
        }
      });

      return (
        <div
          key={`day-${day.date.getTime()}`}
          className={`
          relative flex flex-col border-r border-gray-200 dark:border-gray-700 last:border-r-0
          ${!belongsToCurrentMonth ? 'text-gray-400 dark:text-gray-600' : 'text-gray-800 dark:text-gray-100'}
        `}
          style={{ height: weekHeightPx }}
          data-date={createDateString(day.date)}
          onDoubleClick={e => onCreateStart?.(e, day.date)}
          onTouchStart={e => {
            if (screenSize !== 'mobile' && !enableTouch) return;
            const touch = e.touches[0];
            const clientX = touch.clientX;
            const clientY = touch.clientY;
            touchStartPosRef.current = { x: clientX, y: clientY };

            longPressTimerRef.current = setTimeout(() => {
              onCreateStart?.(e, day.date);
              longPressTimerRef.current = null;
              if (navigator.vibrate) navigator.vibrate(50);
            }, 500);
          }}
          onTouchMove={e => {
            if (longPressTimerRef.current && touchStartPosRef.current) {
              const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
              const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
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
          onDragOver={onCalendarDragOver}
          onDrop={e => onCalendarDrop?.(e, day.date)}
        >
          {/* Date number area */}
          <div className="flex items-center justify-between px-2 h-[33px] relative z-20">
            <div className="flex-1" />
            <div className="flex items-center">
              {(
                <span
                  className={`
                    inline-flex items-center justify-center h-6 min-w-6 rounded-full text-sm font-medium whitespace-nowrap px-1
                    ${day.isToday
                      ? 'bg-primary text-primary-foreground'
                      : belongsToCurrentMonth
                        ? 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-400 dark:text-gray-600'
                    }
                  `}
                >
                  {
                    day.day === 1 && screenSize === 'desktop' ? (day.date.toLocaleDateString(locale, {
                      month: 'short',
                      day: 'numeric',
                    })) : day.day
                  }
                </span>
              )}
            </div>
          </div>

          {/* Event display area */}
          <div className="flex-1 overflow-hidden px-1">
            {renderElements}

            {/* More events indicator */}
            {hasMoreEvents && (
              <div
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer hover:underline text-center md:text-left font-medium md:font-normal"
                onClick={e => {
                  e.stopPropagation();
                  if (onMoreEventsClick) {
                    onMoreEventsClick(day.date);
                  } else {
                    onSelectDate?.(day.date);
                    onChangeView?.(ViewType.DAY);
                  }
                }}
              >
                +{hiddenEventsCount} <span className="hidden md:inline">{t('more')}</span>
              </div>
            )}
          </div>
        </div>
      );
    };

    const localizedMonthYear = useMemo(() => {
      if (!firstDayOfMonth) return '';
      return firstDayOfMonth.date.toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
      });
    }, [firstDayOfMonth, locale]);

    return (
      <div
        className="relative select-none border-b border-gray-200 dark:border-gray-700"
        style={{ height: weekHeightPx }}
      >
        {/* Month title: displayed when scrolling, hidden after scrolling stops */}
        {firstDayOfMonth && (
          <div
            className={`
            absolute top-10 left-0 z-30 bg-white/50 dark:bg-gray-900/50 py-2 px-2 duration-300
            ${shouldShowMonthTitle ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          `}
            style={{
              transition: 'opacity 0.5s ease',
              maxWidth: 'fit-content',
            }}
          >
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {localizedMonthYear}
            </span>
          </div>
        )}

        <div className="h-full flex flex-col">
          <div className="calendar-week relative h-full">
            {/* Date grid */}
            <div className="grid grid-cols-7 h-full">
              {weekData.days.map((day, index) => renderDayCell(day, index))}
            </div>

            {/* Multi-day event overlay layer */}
            {organizedMultiDaySegments.length > 0 && (
              <div
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: `${MULTI_DAY_TOP_OFFSET}px`,
                  height: `${multiDayAreaHeight}px`,
                  zIndex: 10,
                }}
              >
                {organizedMultiDaySegments.map((layer, layerIndex) => (
                  <div key={`layer-${layerIndex}`} className="absolute inset-0">
                    {layer.map(segment => (
                      <CalendarEvent
                        key={segment.id}
                        event={segment.event}
                        isAllDay={!!segment.event.allDay}
                        segment={segment}
                        segmentIndex={layerIndex}
                        isMonthView={true}
                        isMultiDay={true}
                        calendarRef={calendarRef}
                        hourHeight={72}
                        firstHour={0}
                        onEventUpdate={onEventUpdate}
                        onEventDelete={onEventDelete}
                        onMoveStart={onMoveStart}
                        onResizeStart={onResizeStart}
                        isBeingDragged={
                          isDragging &&
                          dragState.eventId === segment.event.id &&
                          dragState.mode === 'move'
                        }
                        isBeingResized={
                          isDragging &&
                          dragState.eventId === segment.event.id &&
                          dragState.mode === 'resize'
                        }
                        newlyCreatedEventId={newlyCreatedEventId}
                        onDetailPanelOpen={onDetailPanelOpen}
                        selectedEventId={selectedEventId}
                        onEventSelect={onEventSelect}
                        onEventLongPress={onEventLongPress}
                        detailPanelEventId={detailPanelEventId}
                        onDetailPanelToggle={onDetailPanelToggle}
                        customDetailPanelContent={customDetailPanelContent}
                        customEventDetailDialog={customEventDetailDialog}
                        app={app}
                        isMobile={screenSize !== 'desktop'}
                        enableTouch={enableTouch}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

WeekComponent.displayName = 'WeekComponent';

export default WeekComponent;
