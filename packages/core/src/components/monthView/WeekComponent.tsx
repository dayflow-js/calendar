import { RefObject } from 'preact';
import { memo } from 'preact/compat';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import CalendarEvent from '@/components/calendarEvent';
import { GridContextMenu } from '@/components/contextMenu';
import { useLocale } from '@/locale';
import { monthTitle } from '@/styles/classNames';
import {
  MonthEventDragState,
  Event,
  ViewType,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ICalendarApp,
} from '@/types';
import { VirtualWeekItem } from '@/types/monthView';
import { scrollbarTakesSpace, temporalToVisualDate } from '@/utils';

import {
  analyzeMultiDayEventsForWeek,
  constructRenderEvents,
  MonthDayLayoutData,
  organizeMultiDaySegments,
  sortDayEvents,
} from './util';
import WeekDayCell from './WeekDayCell';

interface WeekComponentProps {
  currentMonth: string;
  currentYear: number;
  newlyCreatedEventId: string | null;
  screenSize: 'mobile' | 'tablet' | 'desktop';
  isScrolling: boolean;
  isDragging: boolean;
  showWeekNumbers?: boolean;
  showMonthIndicator?: boolean;
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
  appTimeZone?: string;
}

// Constants
const ROW_SPACING = 17;
const MULTI_DAY_TOP_OFFSET = 33;
const MORE_TEXT_HEIGHT = 20; // Height reserved for the "+ x more" indicator

const WeekComponent = memo(
  ({
    currentMonth,
    currentYear,
    newlyCreatedEventId,
    screenSize,
    isScrolling,
    isDragging,
    showWeekNumbers,
    showMonthIndicator = true,
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
    appTimeZone,
  }: WeekComponentProps) => {
    const { t, locale } = useLocale();
    const [shouldShowMonthTitle, setShouldShowMonthTitle] = useState(false);
    const hideTitleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

    const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
      date: Date;
    } | null>(null);
    const isEditable = app.canMutateFromUI();

    useEffect(() => {
      if (isEditable) return;
      setContextMenu(null);
    }, [isEditable]);

    const handleContextMenu = (e: MouseEvent, date: Date) => {
      e.preventDefault();
      if (screenSize === 'mobile' || !isEditable) return;
      setContextMenu({ x: e.clientX, y: e.clientY, date });
    };

    // Calculate layout parameters once per week render
    const layoutParams = useMemo(() => {
      const availableHeight = weekHeight - MULTI_DAY_TOP_OFFSET;
      if (availableHeight <= 0) return { maxSlots: 0, maxSlotsWithMore: 0 };

      const maxSlots = Math.floor(availableHeight / ROW_SPACING);

      const spaceForMore = availableHeight - MORE_TEXT_HEIGHT;
      const maxSlotsWithMoreRaw = Math.max(
        0,
        Math.floor(spaceForMore / ROW_SPACING)
      );

      // Ensure maxSlotsWithMore is always at most maxSlots - 1 to leave room for the "+ x more" indicator
      const maxSlotsWithMore =
        maxSlots > 0
          ? Math.min(maxSlotsWithMoreRaw, maxSlots - 1)
          : maxSlotsWithMoreRaw;

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

    const hasScrollbarSpace = useMemo(() => scrollbarTakesSpace(), []);

    // Analyze multi-day events for the current week
    const multiDaySegments = useMemo(
      () =>
        analyzeMultiDayEventsForWeek(
          events,
          weekData.startDate,
          7,
          appTimeZone
        ),
      [events, weekData.startDate, appTimeZone]
    );

    // Build render events
    const constructedRenderEvents = useMemo(
      () => constructRenderEvents(events, weekData.startDate, appTimeZone),
      [events, weekData.startDate, appTimeZone]
    );

    // Pre-compute events grouped by day to replace 7× O(n) filter calls on every render
    const eventsByDayDate = useMemo(() => {
      const map = new Map<string, Event[]>();
      weekData.days.forEach(day => {
        const dayDateStr = day.date.toDateString();
        map.set(
          dayDateStr,
          constructedRenderEvents.filter(event => {
            if (!event.start || !event.end) {
              return (
                temporalToVisualDate(
                  event.start,
                  appTimeZone
                ).toDateString() === dayDateStr
              );
            }
            const startDate = temporalToVisualDate(event.start, appTimeZone);
            const endDate = temporalToVisualDate(event.end, appTimeZone);
            if (!event.allDay) {
              const endHasTime =
                endDate.getHours() !== 0 ||
                endDate.getMinutes() !== 0 ||
                endDate.getSeconds() !== 0;
              if (!endHasTime) {
                const durationMs = endDate.getTime() - startDate.getTime();
                const ONE_DAY_MS = 24 * 60 * 60 * 1000;
                if (durationMs > 0 && durationMs < ONE_DAY_MS) {
                  return startDate.toDateString() === dayDateStr;
                }
              }
            }
            return (
              startDate.toDateString() === dayDateStr ||
              endDate.toDateString() === dayDateStr
            );
          })
        );
      });
      return map;
    }, [constructedRenderEvents, weekData.days, appTimeZone]);

    // Organize multi-day event segments
    const organizedMultiDaySegments = useMemo(
      () =>
        organizeMultiDaySegments(
          multiDaySegments,
          app.state.allDaySortComparator
        ),
      [multiDaySegments, app.state.allDaySortComparator]
    );

    // Memoize flat segment list to avoid 7× flat() calls inside renderDayCell
    const allSegments = useMemo(
      () => organizedMultiDaySegments.flat(),
      [organizedMultiDaySegments]
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

    const dayLayoutData = useMemo<MonthDayLayoutData[]>(() => {
      const { maxSlots, maxSlotsWithMore } = layoutParams;

      // 1. Initial pass: calculate total slots and basic "more" check for each day
      const initialResults = weekData.days.map((day, dayIndex) => {
        const dayEvents = eventsByDayDate.get(day.date.toDateString()) ?? [];
        const sortedEvents = sortDayEvents(dayEvents);

        // Filter out all-day events that are rendered as multi-day segments
        const timedEventsOnly = sortedEvents.filter(event => {
          if (!event.allDay) return true;
          const hasSegment = allSegments.some(
            seg => seg.originalEventId === event.id
          );
          return !hasSegment;
        });

        const maxOccupiedLayer = (dayLayerCounts[dayIndex] ?? 0) - 1;
        const occupiedLayers = dayOccupiedLayers[dayIndex];
        const gapLayers: number[] = [];
        for (let i = 0; i <= maxOccupiedLayer; i++) {
          if (!occupiedLayers.has(i)) {
            gapLayers.push(i);
          }
        }

        const totalTimedEvents = timedEventsOnly.length;
        const eventsAfterMultiDay = Math.max(
          0,
          totalTimedEvents - gapLayers.length
        );
        const totalSlotsNeeded =
          Math.max(maxOccupiedLayer + 1, 0) + eventsAfterMultiDay;

        const hasMore = totalSlotsNeeded > maxSlots;
        const limit = hasMore ? maxSlotsWithMore : maxSlots;

        return {
          totalSlotsNeeded,
          hasMore,
          limit,
          timedEventsOnly,
          gapLayers,
          occupiedLayers,
          maxOccupiedLayer,
        };
      });

      // 2. Multi-day segment visibility check
      // A segment in Layer L is hidden if it spans any day where L >= limit
      const segmentIsHidden = new Set<string>(); // segment.id
      organizedMultiDaySegments.forEach((layer, layerIndex) => {
        layer.forEach(segment => {
          for (let d = segment.startDayIndex; d <= segment.endDayIndex; d++) {
            if (d >= 0 && d < 7 && layerIndex >= initialResults[d].limit) {
              segmentIsHidden.add(segment.id);
              break;
            }
          }
        });
      });

      // 3. Final pass: update hasMore and limit if a day contains a segment that was forced to hide
      return initialResults.map((res, dayIndex) => {
        let hasHiddenSegment = false;
        allSegments.forEach(segment => {
          if (
            segment.startDayIndex <= dayIndex &&
            segment.endDayIndex >= dayIndex &&
            segmentIsHidden.has(segment.id)
          ) {
            hasHiddenSegment = true;
          }
        });

        const finalHasMore = res.hasMore || hasHiddenSegment;
        const finalLimit = finalHasMore ? maxSlotsWithMore : maxSlots;

        return {
          ...res,
          hasMore: finalHasMore,
          limit: finalLimit,
          segmentIsHidden,
        };
      });
    }, [
      layoutParams,
      weekData.days,
      eventsByDayDate,
      allSegments,
      dayLayerCounts,
      dayOccupiedLayers,
      organizedMultiDaySegments,
    ]);

    const overlayVisibleLayerCount = useMemo(
      () => Math.min(organizedMultiDaySegments.length, layoutParams.maxSlots),
      [organizedMultiDaySegments.length, layoutParams.maxSlots]
    );

    // Calculate the height of the multi-day event area
    const multiDayAreaHeight = useMemo(
      () => Math.max(0, overlayVisibleLayerCount * ROW_SPACING),
      [overlayVisibleLayerCount]
    );

    const localizedMonthYear = useMemo(() => {
      if (!firstDayOfMonth) return '';
      return firstDayOfMonth.date.toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
      });
    }, [firstDayOfMonth, locale]);

    return (
      <div className='df-month-week' style={{ height: weekHeightPx }}>
        {/* Month title: displayed when scrolling, hidden after scrolling stops */}
        {showMonthIndicator && firstDayOfMonth && (
          <div
            className={monthTitle}
            data-visible={shouldShowMonthTitle ? 'true' : 'false'}
            style={{
              transition: 'opacity 0.5s ease',
              maxWidth: 'fit-content',
            }}
            onContextMenu={e => e.preventDefault()}
          >
            <span className='df-month-title-label'>{localizedMonthYear}</span>
          </div>
        )}

        <div className='df-month-week-inner'>
          <div className='df-month-week-grid-shell'>
            {/* Date grid */}
            <div className='df-month-week-grid'>
              {weekData.days.map((day, index) => (
                <WeekDayCell
                  key={`day-${day.date.getTime()}`}
                  app={app}
                  appTimeZone={appTimeZone}
                  calendarRef={calendarRef}
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  customDetailPanelContent={customDetailPanelContent}
                  customEventDetailDialog={customEventDetailDialog}
                  day={day}
                  dayIndex={index}
                  dayLayout={dayLayoutData[index]}
                  detailPanelEventId={detailPanelEventId}
                  dragState={dragState}
                  enableTouch={enableTouch}
                  hasScrollbarSpace={hasScrollbarSpace}
                  isDragging={isDragging}
                  locale={locale}
                  moreLabel={t('more')}
                  newlyCreatedEventId={newlyCreatedEventId}
                  onCalendarDragOver={onCalendarDragOver}
                  onCalendarDrop={onCalendarDrop}
                  onChangeView={onChangeView}
                  onContextMenu={handleContextMenu}
                  onCreateStart={onCreateStart}
                  onDetailPanelOpen={onDetailPanelOpen}
                  onDetailPanelToggle={onDetailPanelToggle}
                  onEventDelete={onEventDelete}
                  onEventLongPress={onEventLongPress}
                  onEventSelect={onEventSelect}
                  onEventUpdate={onEventUpdate}
                  onMoreEventsClick={onMoreEventsClick}
                  onMoveStart={onMoveStart}
                  onResizeStart={onResizeStart}
                  onSelectDate={onSelectDate}
                  organizedMultiDaySegments={organizedMultiDaySegments}
                  overlayVisibleLayerCount={overlayVisibleLayerCount}
                  screenSize={screenSize}
                  selectedEventId={selectedEventId}
                  showWeekNumbers={showWeekNumbers}
                  totalSlotsNeeded={dayLayoutData[index].totalSlotsNeeded}
                  weekHeightPx={weekHeightPx}
                />
              ))}
            </div>

            {/* Multi-day event overlay layer */}
            {organizedMultiDaySegments.length > 0 && (
              <div
                className='df-month-week-event-layer'
                style={{
                  top: `${MULTI_DAY_TOP_OFFSET}px`,
                  height: `${multiDayAreaHeight}px`,
                }}
              >
                {organizedMultiDaySegments
                  .slice(0, overlayVisibleLayerCount)
                  .map((layer, layerIndex) => (
                    <div
                      key={`layer-${layerIndex}`}
                      className='df-month-week-event-layer-row'
                    >
                      {layer
                        .filter(
                          segment =>
                            !dayLayoutData[0].segmentIsHidden.has(segment.id)
                        )
                        .map(segment => (
                          <CalendarEvent
                            key={segment.id}
                            event={segment.event}
                            isAllDay={true}
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
                            appTimeZone={appTimeZone}
                          />
                        ))}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
        {isEditable && contextMenu && (
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
  },
  (prevProps, nextProps) =>
    prevProps.currentMonth === nextProps.currentMonth &&
    prevProps.currentYear === nextProps.currentYear &&
    prevProps.newlyCreatedEventId === nextProps.newlyCreatedEventId &&
    prevProps.screenSize === nextProps.screenSize &&
    prevProps.isScrolling === nextProps.isScrolling &&
    prevProps.showWeekNumbers === nextProps.showWeekNumbers &&
    prevProps.showMonthIndicator === nextProps.showMonthIndicator &&
    prevProps.item.weekData === nextProps.item.weekData &&
    prevProps.weekHeight === nextProps.weekHeight &&
    prevProps.events === nextProps.events &&
    prevProps.calendarRef === nextProps.calendarRef &&
    prevProps.onEventUpdate === nextProps.onEventUpdate &&
    prevProps.onEventDelete === nextProps.onEventDelete &&
    prevProps.onMoveStart === nextProps.onMoveStart &&
    prevProps.onCreateStart === nextProps.onCreateStart &&
    prevProps.onResizeStart === nextProps.onResizeStart &&
    prevProps.onDetailPanelOpen === nextProps.onDetailPanelOpen &&
    prevProps.onMoreEventsClick === nextProps.onMoreEventsClick &&
    prevProps.onChangeView === nextProps.onChangeView &&
    prevProps.onSelectDate === nextProps.onSelectDate &&
    prevProps.selectedEventId === nextProps.selectedEventId &&
    prevProps.onEventSelect === nextProps.onEventSelect &&
    prevProps.onEventLongPress === nextProps.onEventLongPress &&
    prevProps.detailPanelEventId === nextProps.detailPanelEventId &&
    prevProps.onDetailPanelToggle === nextProps.onDetailPanelToggle &&
    prevProps.customDetailPanelContent === nextProps.customDetailPanelContent &&
    prevProps.customEventDetailDialog === nextProps.customEventDetailDialog &&
    prevProps.onCalendarDrop === nextProps.onCalendarDrop &&
    prevProps.onCalendarDragOver === nextProps.onCalendarDragOver &&
    prevProps.app === nextProps.app &&
    prevProps.enableTouch === nextProps.enableTouch &&
    prevProps.appTimeZone === nextProps.appTimeZone
);

(WeekComponent as { displayName?: string }).displayName = 'WeekComponent';

export default WeekComponent;
