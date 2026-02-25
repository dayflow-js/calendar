import { RefObject } from 'preact';
import { memo } from 'preact/compat';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import CalendarEvent from '@/components/calendarEvent';
import { GridContextMenu } from '@/components/contextMenu';
import { useLocale } from '@/locale';
import {
  monthDayCell,
  monthDateNumberContainer,
  monthDateNumber,
  monthMoreEvents,
  monthTitle,
  cn,
} from '@/styles/classNames';
import {
  MonthEventDragState,
  Event,
  ViewType,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ICalendarApp,
} from '@/types';
import { VirtualWeekItem } from '@/types/monthView';
import { extractHourFromDate } from '@/utils/helpers';
import { logger } from '@/utils/logger';
import { temporalToDate } from '@/utils/temporal';

import { analyzeMultiDayEventsForWeek } from './util';

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
  calendarRef: RefObject<HTMLDivElement>;
  onEventUpdate: (updatedEvent: Event) => void;
  onEventDelete: (eventId: string) => void;
  onMoveStart?: (e: MouseEvent | TouchEvent, event: Event) => void;
  onCreateStart?: (e: MouseEvent | TouchEvent, targetDate: Date) => void;
  onResizeStart?: (
    e: MouseEvent | TouchEvent,
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
  onCalendarDrop?: (
    e: DragEvent,
    dropDate: Date,
    dropHour?: number,
    isAllDay?: boolean
  ) => Event | null;
  onCalendarDragOver?: (e: DragEvent) => void;
  calendarSignature?: string;
  app: ICalendarApp;
  enableTouch?: boolean;
}

// Constants
const ROW_HEIGHT = 16;
const ROW_SPACING = 17;
const MULTI_DAY_TOP_OFFSET = 33;
const MORE_TEXT_HEIGHT = 20; // Height reserved for the "+ x more" indicator

// Organize multi-day event segments
const organizeMultiDaySegments = (multiDaySegments: MultiDayEventSegment[]) => {
  const sortedSegments = [...multiDaySegments].toSorted((a, b) => {
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
      let hasConflict = false;
      for (const existingSegment of segmentsWithPosition) {
        const yConflict =
          Math.abs((existingSegment.yPosition ?? 0) - yPosition) < ROW_HEIGHT;
        const timeConflict = !(
          segment.endDayIndex < existingSegment.startDayIndex ||
          segment.startDayIndex > existingSegment.endDayIndex
        );
        if (yConflict && timeConflict) {
          hasConflict = true;
          break;
        }
      }

      if (hasConflict) {
        yPosition += ROW_HEIGHT;
      } else {
        positionFound = true;
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
const constructRenderEvents = (events: Event[], weekStart: Date): Event[] => {
  const renderEvents: Event[] = [];

  // Calculate week end time
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

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
      const endHasTime =
        end.getHours() !== 0 ||
        end.getMinutes() !== 0 ||
        end.getSeconds() !== 0;
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
    const isMultiDay =
      startDate.toDateString() !== adjustedEndDate.toDateString();

    // Multi-day regular events: rendered through segment, skipping here
    if (isMultiDay && !event.allDay) {
      return;
    }

    // Multi-day all-day events: create event instances for each day (keeping old logic for all-day events)
    if (isMultiDay && event.allDay) {
      // Optimize: Only generate instances for days within the current week
      let current = new Date(start);
      if (current < weekStart) {
        current = new Date(weekStart);
        // Reset time to ensure start at the beginning of the day
        current.setHours(0, 0, 0, 0);
      }

      const loopEnd = end > weekEnd ? weekEnd : end;

      for (
        let t = start.getTime();
        t <= loopEnd.getTime();
        t += 24 * 60 * 60 * 1000
      ) {
        const currentLoopDate = new Date(t);
        if (currentLoopDate < weekStart) continue; // Skip days before the current week start

        const currentTemporal = Temporal.PlainDate.from({
          year: currentLoopDate.getFullYear(),
          month: currentLoopDate.getMonth() + 1,
          day: currentLoopDate.getDate(),
        });

        renderEvents.push({
          ...event,
          start: currentTemporal,
          end: currentTemporal,
          day: current.getDay(),
        });
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
const sortDayEvents = (events: Event[]): Event[] =>
  [...events].toSorted((a, b) => {
    // All-day events first
    if (a.allDay !== b.allDay) {
      return a.allDay ? -1 : 1;
    }

    // If both are all-day events, keep the original order
    if (a.allDay && b.allDay) return 0;

    // Non-all-day events sorted by start time
    return extractHourFromDate(a.start) - extractHourFromDate(b.start);
  });

// Create date string
const createDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WeekComponent = memo(
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
  }: WeekComponentProps) => {
    const { t, locale } = useLocale();
    const [shouldShowMonthTitle, setShouldShowMonthTitle] = useState(false);
    const hideTitleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
      date: Date;
    } | null>(null);

    const handleContextMenu = (e: MouseEvent, date: Date) => {
      e.preventDefault();
      if (screenSize === 'mobile') return;
      setContextMenu({ x: e.clientX, y: e.clientY, date });
    };

    // Calculate layout parameters once per week render
    const layoutParams = useMemo(() => {
      const availableHeight = weekHeight - MULTI_DAY_TOP_OFFSET;
      if (availableHeight <= 0) return { maxSlots: 0, maxSlotsWithMore: 0 };

      const hardCap = 4;
      const maxSlots = Math.min(
        hardCap,
        Math.floor(availableHeight / ROW_SPACING)
      );

      const spaceForMore = availableHeight - MORE_TEXT_HEIGHT;
      const maxSlotsWithMore = Math.min(
        hardCap,
        Math.max(0, Math.floor(spaceForMore / ROW_SPACING))
      );

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
      () => constructRenderEvents(events, weekData.startDate),
      [events, weekData.startDate]
    );

    // Organize multi-day event segments
    const organizedMultiDaySegments = useMemo(
      () => organizeMultiDaySegments(multiDaySegments),
      [multiDaySegments]
    );

    const dayLayerCounts = useMemo(() => {
      const counts: number[] = Array.from({ length: 7 }).fill(0) as number[];

      organizedMultiDaySegments.forEach((layer, layerIndex) => {
        layer.forEach(segment => {
          for (
            let dayIndex = segment.startDayIndex;
            dayIndex <= segment.endDayIndex;
            dayIndex++
          ) {
            counts[dayIndex] = Math.max(
              counts[dayIndex] as number,
              layerIndex + 1
            );
          }
        });
      });

      return counts;
    }, [organizedMultiDaySegments]);

    // Track which specific layers are occupied by multi-day events for each day
    // This allows single-day events to fill "gaps" in the multi-day event layers
    const dayOccupiedLayers = useMemo(() => {
      const occupied: Set<number>[] = Array.from(
        { length: 7 },
        () => new Set()
      );

      organizedMultiDaySegments.forEach((layer, layerIndex) => {
        layer.forEach(segment => {
          for (
            let dayIndex = segment.startDayIndex;
            dayIndex <= segment.endDayIndex;
            dayIndex++
          ) {
            if (dayIndex >= 0 && dayIndex < 7) {
              occupied[dayIndex].add(layerIndex);
            }
          }
        });
      });

      return occupied;
    }, [organizedMultiDaySegments]);

    // Calculate effective max layers for multi-day overlay
    // If any day needs "+ x more" indicator, must use maxSlotsWithMore for the overlay
    const effectiveMaxLayers = useMemo(() => {
      const allSegments = organizedMultiDaySegments.flat();
      // Check if any day has more total visual slots than maxSlots
      // Timed events can fill gaps in multi-day layers, so need to calculate properly
      for (let dayIndex = 0; dayIndex < weekData.days.length; dayIndex++) {
        const day = weekData.days[dayIndex];
        // Get events for this day from constructedRenderEvents
        const dayEvents = constructedRenderEvents.filter(event => {
          if (!event.start || !event.end) {
            return (
              temporalToDate(event.start).toDateString() ===
              day.date.toDateString()
            );
          }
          const startDate = temporalToDate(event.start);
          const endDate = temporalToDate(event.end);
          if (!event.allDay) {
            const endHasTime =
              endDate.getHours() !== 0 ||
              endDate.getMinutes() !== 0 ||
              endDate.getSeconds() !== 0;
            if (!endHasTime) {
              const durationMs = endDate.getTime() - startDate.getTime();
              const ONE_DAY_MS = 24 * 60 * 60 * 1000;
              if (durationMs > 0 && durationMs < ONE_DAY_MS) {
                return startDate.toDateString() === day.date.toDateString();
              }
            }
          }
          return (
            startDate.toDateString() === day.date.toDateString() ||
            endDate.toDateString() === day.date.toDateString()
          );
        });

        // Filter out all-day events that have segments (they're already counted in multi-day layers)
        const timedEvents = dayEvents.filter(event => {
          if (!event.allDay) return true;
          const hasSegment = allSegments.some(
            seg => seg.originalEventId === event.id
          );
          return !hasSegment;
        });
        // Calculate total slots needed considering that timed events can fill gaps
        const occupiedLayers = dayOccupiedLayers[dayIndex];
        const maxOccupiedLayer = dayLayerCounts[dayIndex] - 1;
        // Count gaps (empty layers within the multi-day range)
        let gapCount = 0;
        for (let i = 0; i <= maxOccupiedLayer; i++) {
          if (!occupiedLayers.has(i)) {
            gapCount++;
          }
        }
        // Timed events first fill gaps, then extend beyond maxOccupiedLayer
        const timedEventsAfterGaps = Math.max(0, timedEvents.length - gapCount);
        const totalVisualSlots = maxOccupiedLayer + 1 + timedEventsAfterGaps;

        if (totalVisualSlots > layoutParams.maxSlots) {
          // This day needs "+ x more", so use maxSlotsWithMore for the whole week
          return layoutParams.maxSlotsWithMore;
        }
      }
      // No day needs "+ x more", use maxSlots
      return layoutParams.maxSlots;
    }, [
      weekData.days,
      constructedRenderEvents,
      organizedMultiDaySegments,
      dayLayerCounts,
      dayOccupiedLayers,
      layoutParams.maxSlots,
      layoutParams.maxSlotsWithMore,
    ]);

    // Calculate the height of the multi-day event area
    const multiDayAreaHeight = useMemo(
      () => Math.max(0, organizedMultiDaySegments.length * ROW_SPACING),
      [organizedMultiDaySegments]
    );

    // Get events for a specific date
    const getEventsForDay = (dayDate: Date): Event[] =>
      constructedRenderEvents.filter(event => {
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
          const endHasTime =
            endDate.getHours() !== 0 ||
            endDate.getMinutes() !== 0 ||
            endDate.getSeconds() !== 0;
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

    // Render date cell
    const renderDayCell = (
      day: (typeof weekData.days)[0],
      dayIndex: number
    ) => {
      // We need to parse currentMonth (localized string) back to month index, OR compare strings
      // Comparing localized month strings is safer than trying to parse back
      const dayMonthName = day.date.toLocaleDateString(locale, {
        month:
          locale.startsWith('zh') || locale.startsWith('ja') ? 'short' : 'long',
      });

      const belongsToCurrentMonth =
        dayMonthName === currentMonth && day.year === currentYear;
      const dayEvents = getEventsForDay(day.date);
      const sortedEvents = sortDayEvents(dayEvents);

      // Filter out all-day events that are rendered as multi-day segments (they occupy their own layer)
      // This prevents double-counting: they already take a layer via segment, shouldn't also count as single-day
      const allSegments = organizedMultiDaySegments.flat();
      const timedEventsOnly = sortedEvents.filter(event => {
        if (!event.allDay) return true; // Keep all timed events
        // Check if this all-day event has a segment (rendered separately in overlay)
        const hasSegment = allSegments.some(
          seg => seg.originalEventId === event.id
        );
        return !hasSegment; // Only keep all-day events WITHOUT segments
      });

      // Get which layers are occupied by multi-day events for this day
      const occupiedLayers = dayOccupiedLayers[dayIndex];
      const maxOccupiedLayer = (dayLayerCounts[dayIndex] ?? 0) - 1;

      // Find gaps (empty layers within the multi-day range that can be filled by timed events)
      const gapLayers: number[] = [];
      for (let i = 0; i <= maxOccupiedLayer; i++) {
        if (!occupiedLayers.has(i)) {
          gapLayers.push(i);
        }
      }

      // Calculate total slots needed:
      // - Timed events first fill gaps in multi-day layers
      // - Remaining timed events extend beyond maxOccupiedLayer
      const totalTimedEvents = timedEventsOnly.length;
      // const eventsInGaps = Math.min(totalTimedEvents, gapLayers.length);
      const eventsAfterMultiDay = Math.max(
        0,
        totalTimedEvents - gapLayers.length
      );
      const totalSlotsNeeded =
        Math.max(maxOccupiedLayer + 1, 0) + eventsAfterMultiDay;

      // Determine if need "+ x more"
      const hasMoreEvents = totalSlotsNeeded > layoutParams.maxSlots;
      const displaySlotLimit = hasMoreEvents
        ? layoutParams.maxSlotsWithMore
        : layoutParams.maxSlots;

      // Calculate how many timed events can display
      // Available slots for timed events = gaps within limit + slots after maxOccupiedLayer within limit
      const gapsWithinLimit = gapLayers.filter(
        l => l < displaySlotLimit
      ).length;
      const slotsAfterMultiDayWithinLimit = Math.max(
        0,
        displaySlotLimit - Math.max(maxOccupiedLayer + 1, 0)
      );
      const displayCount = Math.min(
        totalTimedEvents,
        gapsWithinLimit + slotsAfterMultiDayWithinLimit
      );

      const displayEvents = timedEventsOnly.slice(0, displayCount);
      const hiddenEventsCount = totalTimedEvents - displayCount;

      // Create render array - need to interleave placeholders and timed events
      const renderElements: unknown[] = [];

      // Build a slot-based layout: for each slot, either placeholder (multi-day occupied) or timed event
      let timedEventIndex = 0;
      const slotsToRender = Math.min(displaySlotLimit, totalSlotsNeeded);

      for (let slot = 0; slot < slotsToRender; slot++) {
        if (occupiedLayers.has(slot)) {
          // This slot is occupied by a multi-day event - add placeholder
          renderElements.push(
            <div
              key={`placeholder-layer-${slot}-${day.date.getTime()}`}
              className='shrink-0'
              style={{
                height: `${ROW_SPACING}px`,
                minHeight: `${ROW_SPACING}px`,
              }}
            />
          );
        } else if (timedEventIndex < displayEvents.length) {
          // This slot is a gap or after multi-day layers - fill with timed event
          const event = displayEvents[timedEventIndex];

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
              customDetailPanelContent={customDetailPanelContent}
              customEventDetailDialog={customEventDetailDialog}
              app={app}
              isMobile={screenSize !== 'desktop'}
              enableTouch={enableTouch}
            />
          );
          timedEventIndex++;
        }
      }

      return (
        <div
          key={`day-${day.date.getTime()}`}
          className={cn(
            monthDayCell,
            belongsToCurrentMonth
              ? 'text-gray-800 dark:text-gray-100'
              : 'text-gray-400 dark:text-gray-600',
            screenSize !== 'desktop' && dayIndex === 6
              ? 'border-r-0'
              : 'last:border-r'
          )}
          style={{ height: weekHeightPx }}
          data-date={createDateString(day.date)}
          onClick={() => onSelectDate?.(day.date)}
          onDblClick={e => onCreateStart?.(e, day.date)}
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
              const dx = Math.abs(
                e.touches[0].clientX - touchStartPosRef.current.x
              );
              const dy = Math.abs(
                e.touches[0].clientY - touchStartPosRef.current.y
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
          onDragOver={onCalendarDragOver}
          onDrop={e => onCalendarDrop?.(e, day.date)}
          onContextMenu={e => handleContextMenu(e, day.date)}
        >
          {/* Date number area */}
          <div className={monthDateNumberContainer}>
            {
              <span className={`
                    ${monthDateNumber}
                    ${day.isToday ? 'bg-primary text-primary-foreground' : belongsToCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'}
                  `}>
                {day.day === 1 && screenSize === 'desktop'
                  ? day.date.toLocaleDateString(locale, {
                      month: 'short',
                      day: 'numeric',
                    })
                  : day.day}
              </span>
            }
          </div>

          {/* Event display area */}
          <div className='flex-1 overflow-hidden px-1'>
            {renderElements}

            {/* More events indicator */}
            {hasMoreEvents && (
              <div
                className={cn(
                  monthMoreEvents,
                  screenSize === 'desktop'
                    ? 'text-left font-normal'
                    : 'text-center font-medium'
                )}
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
                +{hiddenEventsCount}
                {screenSize === 'desktop' ? ` ${t('more')}` : ''}
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
        className='relative select-none border-b border-gray-200 dark:border-gray-700'
        style={{ height: weekHeightPx }}
      >
        {/* Month title: displayed when scrolling, hidden after scrolling stops */}
        {firstDayOfMonth && (
          <div
            className={`
            ${monthTitle}
            ${shouldShowMonthTitle ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          `}
            style={{
              transition: 'opacity 0.5s ease',
              maxWidth: 'fit-content',
            }}
            onContextMenu={e => e.preventDefault()}
          >
            <span className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {localizedMonthYear}
            </span>
          </div>
        )}

        <div className='h-full flex flex-col'>
          <div className='calendar-week relative h-full'>
            {/* Date grid */}
            <div className='grid grid-cols-7 h-full'>
              {weekData.days.map((day, index) => renderDayCell(day, index))}
            </div>

            {/* Multi-day event overlay layer */}
            {organizedMultiDaySegments.length > 0 && (
              <div
                className='absolute left-0 right-0 pointer-events-none'
                style={{
                  top: `${MULTI_DAY_TOP_OFFSET}px`,
                  height: `${multiDayAreaHeight}px`,
                  zIndex: 10,
                }}
              >
                {organizedMultiDaySegments
                  .slice(0, effectiveMaxLayers)
                  .map((layer, layerIndex) => (
                    <div
                      key={`layer-${layerIndex}`}
                      className='absolute inset-0'
                    >
                      {layer.map(segment => (
                        <CalendarEvent
                          key={segment.id}
                          event={segment.event}
                          isAllDay={!!segment.event.allDay}
                          segment={segment}
                          segmentIndex={layerIndex}
                          viewType={ViewType.MONTH}
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
        {contextMenu && (
          <GridContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            date={contextMenu.date}
            viewType={ViewType.MONTH}
            onClose={() => setContextMenu(null)}
            app={app}
            onCreateEvent={() => {
              if (onCreateStart) {
                const syntheticEvent = {
                  preventDefault: () => {
                    /* noop */
                  },
                  stopPropagation: () => {
                    /* noop */
                  },
                  clientX: contextMenu.x,
                  clientY: contextMenu.y,
                } as MouseEvent;
                onCreateStart(syntheticEvent, contextMenu.date);
              }
            }}
          />
        )}
      </div>
    );
  }
);

(WeekComponent as { displayName?: string }).displayName = 'WeekComponent';

export default WeekComponent;
