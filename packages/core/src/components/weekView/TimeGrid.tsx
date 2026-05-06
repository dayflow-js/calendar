import { RefObject, CSSProperties, TargetedEvent } from 'preact';
import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from 'preact/hooks';

import CalendarEventComponent from '@/components/calendarEvent';
import { GridContextMenu } from '@/components/contextMenu';
import { analyzeMultiDayRegularEvent } from '@/components/monthView/util';
import {
  timeSlot,
  timeLabel,
  timeGridRow,
  timeGridCell,
  currentTimeLine,
  currentTimeLabel,
  timeGridBoundary,
} from '@/styles/classNames';
import {
  EventLayout,
  Event as CalendarEvent,
  WeekDayDragState,
  ViewType,
  ICalendarApp,
} from '@/types';
import {
  formatTime,
  getEventsForDay,
  getAllDayEventsForDay,
  scrollbarTakesSpace,
} from '@/utils';
import {
  startPendingCreate,
  finalizeCreateOnDblClick,
} from '@/views/utils/dragCreate';

interface TimeGridProps {
  app: ICalendarApp;
  timeSlots: Array<{ hour: number; label: string }>;
  weekDaysLabels: string[];
  currentWeekStart: Date;
  currentWeekEvents: CalendarEvent[];
  eventLayouts: Map<number, Map<string, EventLayout>>;
  gridWidth: string;
  isMobile: boolean;
  isSlidingView: boolean;
  isTouch: boolean;
  scrollerRef: RefObject<HTMLDivElement>;
  timeGridRef: RefObject<HTMLDivElement>;
  leftFrozenContentRef: RefObject<HTMLDivElement>;
  swipeContentRef: RefObject<HTMLDivElement>;
  calendarRef: RefObject<HTMLDivElement>;
  handleScroll: (e: TargetedEvent<HTMLDivElement, globalThis.Event>) => void;
  secondaryTimeSlots?: string[];
  handleCreateStart?: (
    e: MouseEvent | TouchEvent,
    dayIndex: number,
    hour: number
  ) => void;
  handleTouchStart: (e: TouchEvent, dayIndex: number, hour: number) => void;
  handleTouchEnd: () => void;
  handleTouchMove: (e: TouchEvent) => void;
  handleDragOver: (e: DragEvent) => void;
  handleDrop: (
    e: DragEvent,
    date: Date,
    hour?: number,
    allDay?: boolean
  ) => void;
  dragState: WeekDayDragState | null;
  isDragging: boolean;
  handleMoveStart: (e: MouseEvent | TouchEvent, event: CalendarEvent) => void;
  handleResizeStart: (
    e: MouseEvent | TouchEvent,
    event: CalendarEvent,
    direction: string
  ) => void;
  handleEventUpdate: (event: CalendarEvent) => void;
  handleEventDelete: (id: string) => void;
  setDraftEvent: (event: CalendarEvent | null) => void;
  setIsDrawerOpen: (isOpen: boolean) => void;

  onDateChange?: (date: Date) => void;
  onGridDateClick?: (date: Date, events: CalendarEvent[]) => void;
  onGridDateDoubleClick?: (date: Date, events: CalendarEvent[]) => void;
  newlyCreatedEventId: string | null;
  setNewlyCreatedEventId: (id: string | null) => void;
  selectedEventId: string | null;
  setSelectedEventId: (eventId: string | null) => void;
  detailPanelEventId: string | null;
  setDetailPanelEventId: (eventId: string | null) => void;
  useEventDetailPanel?: boolean;
  isCurrentWeek: boolean;
  currentTime: Date | null;
  HOUR_HEIGHT: number;
  FIRST_HOUR: number;
  LAST_HOUR: number;
  showStartOfDayLabel: boolean;
  timeFormat?: '12h' | '24h';
  appTimeZone?: string;
}

export const TimeGrid = ({
  app,
  timeSlots,
  weekDaysLabels,
  currentWeekStart,
  currentWeekEvents,
  eventLayouts,
  gridWidth,
  isMobile,
  isSlidingView,
  isTouch,
  scrollerRef,
  timeGridRef,
  leftFrozenContentRef,
  swipeContentRef,
  calendarRef,
  handleScroll,
  handleCreateStart,
  handleTouchStart,
  handleTouchEnd,
  handleTouchMove,
  handleDragOver,
  handleDrop,
  dragState,
  isDragging,
  handleMoveStart,
  handleResizeStart,
  handleEventUpdate,
  handleEventDelete,
  setDraftEvent,
  setIsDrawerOpen,
  onDateChange,
  onGridDateClick,
  onGridDateDoubleClick,
  newlyCreatedEventId,
  setNewlyCreatedEventId,
  selectedEventId,
  setSelectedEventId,
  detailPanelEventId,
  setDetailPanelEventId,
  useEventDetailPanel,
  isCurrentWeek,
  currentTime,
  HOUR_HEIGHT,
  FIRST_HOUR,
  LAST_HOUR,
  showStartOfDayLabel,
  timeFormat = '24h',
  secondaryTimeSlots,
  appTimeZone,
}: TimeGridProps) => {
  const hasSecondaryTz = !!secondaryTimeSlots && secondaryTimeSlots.length > 0;
  // On mobile the time column is too narrow for dual labels — hide secondary TZ display
  const showSecondaryTz = hasSecondaryTz && !isMobile;
  const columnStyle: CSSProperties = { flexShrink: 0 };
  const prevHighlightedEventId = useRef(app.state.highlightedEventId);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    date: Date;
  } | null>(null);
  const hasScrollbarSpace = useMemo(() => scrollbarTakesSpace(), []);
  const isEditable = app.canMutateFromUI();

  useEffect(() => {
    if (isEditable) return;
    setContextMenu(null);
  }, [isEditable]);

  const allEventSegmentsByDay = useMemo(() => {
    const result = new Map<
      number,
      Array<{
        event: CalendarEvent;
        segmentInfo?: {
          startHour: number;
          endHour: number;
          isFirst: boolean;
          isLast: boolean;
          dayIndex?: number;
        };
      }>
    >();

    weekDaysLabels.forEach((_, dayIndex) => {
      const segments: Array<{
        event: CalendarEvent;
        segmentInfo?: {
          startHour: number;
          endHour: number;
          isFirst: boolean;
          isLast: boolean;
          dayIndex?: number;
        };
      }> = [];

      const dayEvents = getEventsForDay(dayIndex, currentWeekEvents);
      dayEvents.forEach(event => {
        const multiDaySegs = analyzeMultiDayRegularEvent(
          event,
          currentWeekStart,
          weekDaysLabels.length,
          appTimeZone
        );
        if (multiDaySegs.length > 0) {
          const seg = multiDaySegs.find(s => s.dayIndex === dayIndex);
          if (seg) {
            segments.push({ event, segmentInfo: { ...seg, dayIndex } });
          }
        } else {
          segments.push({ event });
        }
      });

      currentWeekEvents.forEach(event => {
        if (event.allDay || event.day === dayIndex) return;
        const multiDaySegs = analyzeMultiDayRegularEvent(
          event,
          currentWeekStart,
          weekDaysLabels.length,
          appTimeZone
        );
        const seg = multiDaySegs.find(s => s.dayIndex === dayIndex);
        if (seg) {
          segments.push({ event, segmentInfo: { ...seg, dayIndex } });
        }
      });

      result.set(dayIndex, segments);
    });

    return result;
  }, [currentWeekEvents, currentWeekStart, weekDaysLabels.length, appTimeZone]);

  const onEventSelectImplRef = useRef<(eventId: string | null) => void>(() => {
    // No-op
  });
  onEventSelectImplRef.current = (eventId: string | null) => {
    const isViewable =
      app.getReadOnlyConfig(eventId ?? undefined).viewable !== false;
    const evt = currentWeekEvents.find(e => e.id === eventId);
    if ((isMobile || isTouch) && evt && isViewable) {
      setDraftEvent(evt);
      setIsDrawerOpen(true);
      return;
    }
    setSelectedEventId(eventId);
    if (app.state.highlightedEventId) {
      app.highlightEvent(null);
      prevHighlightedEventId.current = null;
    }
  };
  const stableOnEventSelect = useCallback(
    (eventId: string | null) => onEventSelectImplRef.current(eventId),
    []
  );
  const stableOnDetailPanelOpen = useCallback(
    () => setNewlyCreatedEventId(null),
    [setNewlyCreatedEventId]
  );
  const stableOnEventLongPress = useCallback(
    (eventId: string) => {
      if (isMobile || isTouch) setSelectedEventId(eventId);
    },
    [isMobile, isTouch, setSelectedEventId]
  );
  const stableOnDetailPanelToggle = useCallback(
    (eventId: string | null) => setDetailPanelEventId(eventId),
    [setDetailPanelEventId]
  );

  /** Returns the fractional hour at the given clientY within the time grid. */
  const getGridHour = (clientY: number) => {
    if (!timeGridRef.current) return FIRST_HOUR;
    const rect = timeGridRef.current.getBoundingClientRect();
    return FIRST_HOUR + (clientY - rect.top) / HOUR_HEIGHT;
  };

  const handleContextMenu = (e: MouseEvent, dayIndex: number, hour: number) => {
    e.preventDefault();
    if (isMobile || !isEditable) return;

    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + dayIndex);

    if (timeGridRef.current) {
      const rect = (timeGridRef.current as HTMLElement).getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      // Convert relativeY to hours based on grid scale
      const floatHour = relativeY / HOUR_HEIGHT + FIRST_HOUR;
      const h = Math.floor(floatHour);
      const m = Math.floor((floatHour - h) * 60);

      // Snap to 15 minutes for better UX
      const snappedMinutes = Math.round(m / 15) * 15;
      const finalHour = snappedMinutes === 60 ? h + 1 : h;
      const finalMinutes = snappedMinutes === 60 ? 0 : snappedMinutes;

      date.setHours(finalHour, finalMinutes, 0, 0);
    } else {
      date.setHours(hour, 0, 0, 0);
    }

    setContextMenu({ x: e.clientX, y: e.clientY, date });
  };

  return (
    <div className='df-week-time-grid'>
      {/* Single scrolling container using CSS Grid (auto | 1fr).
          "auto" sizes the time-label column from the semantic time-column rules
          without needing JS.
          Both columns share the same scroll context so they scroll
          vertically together natively — no JS transform sync needed. */}
      <div
        ref={scrollerRef}
        className='df-calendar-content df-week-time-grid-scroller df-week-time-grid-scroller-shell'
        data-sliding-view={gridWidth === '300%' ? 'true' : 'false'}
        style={{ gridTemplateColumns: 'auto 1fr' }}
        onScroll={handleScroll}
      >
        {/* Time label column — first grid column (auto width from semantic CSS).
            No overflow-hidden: renders at full content height alongside the grid. */}
        <div
          ref={leftFrozenContentRef}
          className='df-week-time-grid-time-column'
          data-secondary-tz={showSecondaryTz ? 'true' : 'false'}
          onContextMenu={e => e.preventDefault()}
        >
          {/* Top boundary spacer — expands to include timezone header when active */}
          <div
            className='df-time-column-spacer df-time-week-column-spacer'
            data-secondary-tz={showSecondaryTz ? 'true' : 'false'}
          >
            {showSecondaryTz ? (
              <>
                {/* Start-of-day label */}
                <div className='df-time-column-tz-row df-time-column-tz-row-boundary'>
                  <span className='df-time-column-tz-value'>
                    {showStartOfDayLabel ? (secondaryTimeSlots?.[0] ?? '') : ''}
                  </span>
                  <span className='df-time-column-tz-value'>
                    {showStartOfDayLabel
                      ? formatTime(FIRST_HOUR, 0, timeFormat)
                      : ''}
                  </span>
                </div>
              </>
            ) : (
              <div className='df-time-column-boundary-label'>
                {showStartOfDayLabel
                  ? formatTime(FIRST_HOUR, 0, timeFormat)
                  : ''}
              </div>
            )}
          </div>
          {timeSlots.map((slot, slotIndex) => (
            <div key={slotIndex} className={timeSlot}>
              {showSecondaryTz ? (
                <div className='df-time-column-tz-row'>
                  <span className='df-time-column-tz-value'>
                    {showStartOfDayLabel && slotIndex === 0
                      ? ''
                      : (secondaryTimeSlots?.[slotIndex] ?? '')}
                  </span>
                  <span className='df-time-column-tz-value'>
                    {showStartOfDayLabel && slotIndex === 0 ? '' : slot.label}
                  </span>
                </div>
              ) : (
                <div className={timeLabel}>
                  {showStartOfDayLabel && slotIndex === 0 ? '' : slot.label}
                </div>
              )}
            </div>
          ))}
          <div className='df-week-time-grid-boundary-tail'>
            {showSecondaryTz ? (
              <div className='df-time-column-tz-row'>
                <span className='df-time-column-tz-value'>
                  {secondaryTimeSlots?.[0] ?? ''}
                </span>
                <span className='df-time-column-tz-value'>
                  {formatTime(0, 0, timeFormat)}
                </span>
              </div>
            ) : (
              <div className={timeLabel}>{formatTime(0, 0, timeFormat)}</div>
            )}
          </div>
          {/* Current Time Label */}
          {isCurrentWeek &&
            currentTime &&
            (() => {
              const now = currentTime;
              const hours = now.getHours() + now.getMinutes() / 60;
              if (hours < FIRST_HOUR || hours > LAST_HOUR) return null;

              const topPx = (hours - FIRST_HOUR) * HOUR_HEIGHT;

              return (
                <div
                  className='df-week-time-grid-current-time-label'
                  style={{
                    top: `${topPx}px`,
                    marginTop: '0.75rem',
                  }}
                >
                  <div className={currentTimeLabel}>
                    {formatTime(hours, 0, timeFormat, false)}
                  </div>
                </div>
              );
            })()}
        </div>

        {/* Grid content — second grid column (1fr), swipe target on mobile.
            gridWidth is relative to this grid track (scroller - sidebarWidth). */}
        <div
          ref={swipeContentRef}
          className='df-week-time-grid-content'
          style={{
            width: gridWidth,
            minWidth: '100%',
            transform: isSlidingView
              ? 'translateX(calc(-100% / 3))'
              : undefined,
          }}
        >
          {/* Time Grid */}
          <div className='df-week-time-grid-grid'>
            {/* Top boundary — height must match left column spacer */}
            <div
              className={`${timeGridBoundary} df-time-grid-boundary-top df-week-time-grid-boundary-row`}
              data-scrollbar-space={
                isMobile || !hasScrollbarSpace ? 'false' : 'true'
              }
            >
              {weekDaysLabels.map((_, dayIndex) => (
                <div
                  key={`boundary_${dayIndex}`}
                  className='df-week-time-grid-boundary-cell'
                  style={columnStyle}
                />
              ))}
            </div>
            <div
              ref={timeGridRef}
              className='df-week-time-grid-grid-inner'
              onDragOver={handleDragOver}
              onDrop={e => {
                const rect = timeGridRef.current?.getBoundingClientRect();
                if (!rect) return;

                const daysToShow = weekDaysLabels.length;
                const relativeX = e.clientX - rect.left;
                const relativeY = e.clientY - rect.top;

                const dayIndex = Math.floor(
                  relativeX / (rect.width / daysToShow)
                );
                const dropHour = Math.floor(
                  FIRST_HOUR + relativeY / HOUR_HEIGHT
                );

                const dropDate = new Date(currentWeekStart);
                dropDate.setDate(currentWeekStart.getDate() + dayIndex);

                handleDrop(e, dropDate, dropHour);
              }}
            >
              {/* Current time line */}
              {isCurrentWeek &&
                currentTime &&
                (() => {
                  const now = currentTime;
                  const hours = now.getHours() + now.getMinutes() / 60;
                  if (hours < FIRST_HOUR || hours > LAST_HOUR) return null;

                  const today = new Date(now);
                  today.setHours(0, 0, 0, 0);
                  const start = new Date(currentWeekStart);
                  start.setHours(0, 0, 0, 0);
                  const diffTime = today.getTime() - start.getTime();
                  const todayIndex = Math.round(
                    diffTime / (1000 * 60 * 60 * 24)
                  );
                  const topPx = (hours - FIRST_HOUR) * HOUR_HEIGHT;

                  return (
                    <div
                      className={currentTimeLine}
                      style={{
                        top: `${topPx}px`,
                        height: 0,
                        zIndex: 20,
                      }}
                    >
                      <div className='df-week-time-grid-current-time-spacer'>
                        {/* Empty left part since it is in frozen column now */}
                      </div>

                      <div className='df-week-time-grid-current-time-track'>
                        {weekDaysLabels.map((_, idx) => (
                          <div
                            key={idx}
                            className='df-week-time-grid-current-time-cell'
                          >
                            <div
                              className='df-week-time-grid-current-line-rail'
                              data-today={idx === todayIndex ? 'true' : 'false'}
                              style={{
                                zIndex: 9999,
                              }}
                            >
                              {idx === todayIndex && todayIndex !== 0 && (
                                <div className='df-week-time-grid-current-line-dot' />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              {timeSlots.map((slot, slotIndex) => (
                <div
                  key={slotIndex}
                  className={timeGridRow}
                  data-scrollbar-space={
                    isMobile || !hasScrollbarSpace ? 'false' : 'true'
                  }
                >
                  {weekDaysLabels.map((_, dayIndex) => (
                    <div
                      key={`${slotIndex}-${dayIndex}`}
                      className={`${timeGridCell} df-week-time-grid-cell`}
                      style={columnStyle}
                      onClick={() => {
                        const clickedDate = new Date(currentWeekStart);
                        clickedDate.setDate(
                          currentWeekStart.getDate() + dayIndex
                        );
                        if (onGridDateClick) {
                          const dayEvents = [
                            ...getEventsForDay(dayIndex, currentWeekEvents),
                            ...getAllDayEventsForDay(
                              dayIndex,
                              currentWeekEvents,
                              currentWeekStart
                            ),
                          ];
                          onGridDateClick(clickedDate, dayEvents);
                        } else {
                          onDateChange?.(clickedDate);
                        }
                      }}
                      onMouseDown={e => {
                        startPendingCreate(
                          e,
                          dayIndex,
                          getGridHour(e.clientY),
                          isTouch,
                          handleCreateStart
                        );
                      }}
                      onDblClick={e => {
                        const clickedDate = new Date(currentWeekStart);
                        clickedDate.setDate(
                          currentWeekStart.getDate() + dayIndex
                        );
                        if (onGridDateDoubleClick) {
                          const dayEvents = [
                            ...getEventsForDay(dayIndex, currentWeekEvents),
                            ...getAllDayEventsForDay(
                              dayIndex,
                              currentWeekEvents,
                              currentWeekStart
                            ),
                          ];
                          onGridDateDoubleClick(clickedDate, dayEvents);
                        } else {
                          handleCreateStart?.(
                            e,
                            dayIndex,
                            getGridHour(e.clientY)
                          );
                          finalizeCreateOnDblClick();
                        }
                      }}
                      onTouchStart={e =>
                        handleTouchStart(e, dayIndex, slot.hour)
                      }
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchMove}
                      onContextMenu={e =>
                        handleContextMenu(e, dayIndex, slot.hour)
                      }
                    />
                  ))}
                </div>
              ))}

              {/* Bottom boundary */}
              <div
                className={`${timeGridBoundary} df-time-grid-boundary-bottom df-week-time-grid-boundary-row`}
                data-scrollbar-space={
                  isMobile || !hasScrollbarSpace ? 'false' : 'true'
                }
              >
                {weekDaysLabels.map((_, dayIndex) => (
                  <div
                    key={`24-${dayIndex}`}
                    className='df-week-time-grid-boundary-cell'
                    style={columnStyle}
                  />
                ))}
              </div>

              {/* Event layer */}
              {weekDaysLabels.map((_, dayIndex) => {
                const daysToShow = weekDaysLabels.length;
                const allEventSegments =
                  allEventSegmentsByDay.get(dayIndex) ?? [];

                return (
                  <div
                    key={`events-day-${dayIndex}`}
                    className='df-week-time-grid-event-layer'
                    style={{
                      left: `calc(${(100 / daysToShow) * dayIndex}%)`,
                      width: `${100 / daysToShow}%`,
                      height: '100%',
                    }}
                  >
                    {allEventSegments.map(({ event, segmentInfo }) => {
                      const dayLayouts = eventLayouts.get(dayIndex);
                      const eventLayout = dayLayouts?.get(event.id);

                      return (
                        <CalendarEventComponent
                          key={
                            segmentInfo
                              ? `${event.id}-seg-${dayIndex}`
                              : event.id
                          }
                          event={event}
                          layout={eventLayout}
                          viewType={ViewType.WEEK}
                          calendarRef={calendarRef}
                          columnsPerRow={daysToShow}
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
                          onDetailPanelOpen={stableOnDetailPanelOpen}
                          selectedEventId={selectedEventId}
                          detailPanelEventId={detailPanelEventId}
                          onEventSelect={stableOnEventSelect}
                          onEventLongPress={stableOnEventLongPress}
                          onDetailPanelToggle={stableOnDetailPanelToggle}
                          useEventDetailPanel={useEventDetailPanel}
                          multiDaySegmentInfo={segmentInfo}
                          app={app}
                          isMobile={isMobile}
                          isSlidingView={isSlidingView}
                          enableTouch={isTouch}
                          appTimeZone={appTimeZone}
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
      {isEditable && contextMenu && (
        <GridContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          date={contextMenu.date}
          viewType={ViewType.WEEK}
          onClose={() => setContextMenu(null)}
          app={app}
          onCreateEvent={() => {
            if (handleCreateStart) {
              // Calculate dayIndex relative to currentWeekStart
              const startOfDay = new Date(currentWeekStart);
              startOfDay.setHours(0, 0, 0, 0);
              const targetDate = new Date(contextMenu.date);
              targetDate.setHours(0, 0, 0, 0);

              const diffTime = targetDate.getTime() - startOfDay.getTime();
              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
              const preciseHour =
                contextMenu.date.getHours() +
                contextMenu.date.getMinutes() / 60;

              const syntheticEvent = {
                preventDefault: () => {
                  /* noop */
                },
                stopPropagation: () => {
                  /* noop */
                },
                clientX: contextMenu.x,
                clientY: contextMenu.y,
              } as unknown as MouseEvent;
              handleCreateStart(syntheticEvent, diffDays, preciseHour);
            }
          }}
        />
      )}
    </div>
  );
};
