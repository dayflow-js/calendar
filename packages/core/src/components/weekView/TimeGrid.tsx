import { RefObject, JSX } from 'preact';
import { useState, useRef } from 'preact/hooks';

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
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  WeekDayDragState,
  ViewType,
  ViewMode,
  ICalendarApp,
} from '@/types';
import { formatTime, getEventsForDay, scrollbarTakesSpace } from '@/utils';

interface TimeGridProps {
  app: ICalendarApp;
  timeSlots: Array<{ hour: number; label: string }>;
  weekDaysLabels: string[];
  currentWeekStart: Date;
  currentWeekEvents: CalendarEvent[];
  eventLayouts: Map<number, Map<string, EventLayout>>;
  gridWidth: string;
  isMobile: boolean;
  isTouch: boolean;
  scrollerRef: RefObject<HTMLDivElement>;
  timeGridRef: RefObject<HTMLDivElement>;
  leftFrozenContentRef: RefObject<HTMLDivElement>;
  calendarRef: RefObject<HTMLDivElement>;
  handleScroll: (
    e: JSX.TargetedEvent<HTMLDivElement, globalThis.Event>
  ) => void;
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

  onDateChange?: (date: Date) => void;
  newlyCreatedEventId: string | null;
  setNewlyCreatedEventId: (id: string | null) => void;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  detailPanelEventId: string | null;
  setDetailPanelEventId: (id: string | null) => void;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  mode?: ViewMode;
  isCompact?: boolean;
  isCurrentWeek: boolean;
  currentTime: Date | null;
  HOUR_HEIGHT: number;
  FIRST_HOUR: number;
  LAST_HOUR: number;
  showStartOfDayLabel: boolean;
  timeFormat?: '12h' | '24h';
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
  isTouch,
  scrollerRef,
  timeGridRef,
  leftFrozenContentRef,
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
  onDateChange,
  newlyCreatedEventId,
  setNewlyCreatedEventId,
  selectedEventId,
  setSelectedEventId,
  detailPanelEventId,
  setDetailPanelEventId,
  customDetailPanelContent,
  customEventDetailDialog,
  mode = 'standard',
  isCompact,
  isCurrentWeek,
  currentTime,
  HOUR_HEIGHT,
  FIRST_HOUR,
  LAST_HOUR,
  showStartOfDayLabel,
  timeFormat = '24h',
}: TimeGridProps) => {
  const columnStyle: JSX.CSSProperties = { flexShrink: 0 };
  const prevHighlightedEventId = useRef(app.state.highlightedEventId);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    date: Date;
  } | null>(null);
  const hasScrollbarSpace = scrollbarTakesSpace();

  const handleContextMenu = (e: MouseEvent, dayIndex: number, hour: number) => {
    e.preventDefault();
    if (isMobile) return;

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
    <div className='relative flex flex-1 overflow-hidden'>
      {/* Left Frozen Column */}
      <div
        className='relative z-10 w-12 shrink-0 overflow-hidden bg-white md:w-20 dark:bg-gray-900'
        onContextMenu={e => e.preventDefault()}
      >
        <div ref={leftFrozenContentRef}>
          {/* Top boundary spacer with start-of-day label */}
          <div className='relative h-3'>
            <div className='absolute right-2 -bottom-1 text-[10px] text-gray-500 select-none md:text-[12px] dark:text-gray-400'>
              {showStartOfDayLabel ? formatTime(FIRST_HOUR, 0, timeFormat) : ''}
            </div>
          </div>
          {timeSlots.map((slot, slotIndex) => (
            <div key={slotIndex} className={timeSlot}>
              <div className={`${timeLabel} text-[10px] md:text-[12px]`}>
                {showStartOfDayLabel && slotIndex === 0 ? '' : slot.label}
              </div>
            </div>
          ))}
          <div className='relative'>
            <div className={`${timeLabel} text-[10px] md:text-[12px]`}>
              {formatTime(0, 0, timeFormat)}
            </div>
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
                  className='pointer-events-none absolute left-0 z-20 flex w-full items-center justify-end'
                  style={{
                    top: `${topPx}px`,
                    transform: 'translateY(-50%)',
                    marginTop: '0.75rem',
                  }}
                >
                  <div className={currentTimeLabel}>
                    {formatTime(hours, 0, timeFormat)}
                  </div>
                </div>
              );
            })()}
        </div>
      </div>

      {/* Scroller */}
      <div
        ref={scrollerRef}
        className={`calendar-content relative flex-1 overflow-auto ${gridWidth === '300%' ? 'overflow-x-hidden' : 'snap-x snap-mandatory'}`}
        onScroll={handleScroll}
      >
        <div className='flex' style={{ width: gridWidth, minWidth: '100%' }}>
          {/* Time Grid */}
          <div className='grow'>
            {/* Top boundary */}
            <div className={`${timeGridBoundary} flex border-t-0`}>
              {weekDaysLabels.map((_, dayIndex) => (
                <div
                  key={`top-${dayIndex}`}
                  className={`relative flex-1 ${dayIndex === weekDaysLabels.length - 1 && (isMobile || !hasScrollbarSpace) ? '' : 'border-r'} border-gray-200 dark:border-gray-700`}
                  style={columnStyle}
                />
              ))}
            </div>
            <div ref={timeGridRef} className='relative'>
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
                        width: '100%',
                        height: 0,
                        zIndex: 20,
                      }}
                    >
                      <div className='flex w-0 items-center'>
                        {/* Empty left part since it is in frozen column now */}
                      </div>

                      <div className='flex flex-1'>
                        {weekDaysLabels.map((_, idx) => (
                          <div key={idx} className='flex flex-1 items-center'>
                            <div
                              className={`relative h-0.5 w-full ${
                                idx === todayIndex
                                  ? 'bg-primary'
                                  : 'bg-primary/30'
                              }`}
                              style={{
                                zIndex: 9999,
                              }}
                            >
                              {idx === todayIndex && todayIndex !== 0 && (
                                <div
                                  className='absolute h-2 w-2 rounded-full bg-primary'
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

              {timeSlots.map((slot, slotIndex) => (
                <div key={slotIndex} className={timeGridRow}>
                  {weekDaysLabels.map((_, dayIndex) => {
                    const dropDate = new Date(currentWeekStart);
                    dropDate.setDate(currentWeekStart.getDate() + dayIndex);
                    return (
                      <div
                        key={`${slotIndex}-${dayIndex}`}
                        className={`${timeGridCell} snap-start ${dayIndex === weekDaysLabels.length - 1 && (isMobile || !hasScrollbarSpace) ? 'border-r-0' : ''}`}
                        style={columnStyle}
                        onClick={() => {
                          const clickedDate = new Date(currentWeekStart);
                          clickedDate.setDate(
                            currentWeekStart.getDate() + dayIndex
                          );
                          onDateChange?.(clickedDate);
                        }}
                        onDblClick={e => {
                          handleCreateStart?.(e, dayIndex, slot.hour);
                        }}
                        onTouchStart={e =>
                          handleTouchStart(e, dayIndex, slot.hour)
                        }
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchMove}
                        onDragOver={handleDragOver}
                        onDrop={e => {
                          handleDrop(e, dropDate, slot.hour);
                        }}
                        onContextMenu={e =>
                          handleContextMenu(e, dayIndex, slot.hour)
                        }
                      />
                    );
                  })}
                </div>
              ))}

              {/* Bottom boundary */}
              <div className={`${timeGridBoundary} flex`}>
                {weekDaysLabels.map((_, dayIndex) => (
                  <div
                    key={`24-${dayIndex}`}
                    className={`relative flex-1 ${dayIndex === weekDaysLabels.length - 1 && (isMobile || !hasScrollbarSpace) ? '' : 'border-r'} border-gray-200 dark:border-gray-700`}
                    style={columnStyle}
                  />
                ))}
              </div>

              {/* Event layer */}
              {weekDaysLabels.map((_, dayIndex) => {
                const daysToShow = weekDaysLabels.length;
                // Collect all event segments for this day
                const dayEvents = getEventsForDay(dayIndex, currentWeekEvents);
                const allEventSegments: Array<{
                  event: CalendarEvent;
                  segmentInfo?: {
                    startHour: number;
                    endHour: number;
                    isFirst: boolean;
                    isLast: boolean;
                    dayIndex?: number;
                  };
                }> = [];

                dayEvents.forEach(event => {
                  const segments = analyzeMultiDayRegularEvent(
                    event,
                    currentWeekStart
                  );
                  if (segments.length > 0) {
                    const segment = segments.find(s => s.dayIndex === dayIndex);
                    if (segment) {
                      allEventSegments.push({
                        event,
                        segmentInfo: { ...segment, dayIndex },
                      });
                    }
                  } else {
                    allEventSegments.push({ event });
                  }
                });

                currentWeekEvents.forEach(event => {
                  if (event.allDay || event.day === dayIndex) return;
                  const segments = analyzeMultiDayRegularEvent(
                    event,
                    currentWeekStart
                  );
                  const segment = segments.find(s => s.dayIndex === dayIndex);
                  if (segment) {
                    allEventSegments.push({
                      event,
                      segmentInfo: { ...segment, dayIndex },
                    });
                  }
                });

                return (
                  <div
                    key={`events-day-${dayIndex}`}
                    className='pointer-events-none absolute top-0'
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
                          onDetailPanelOpen={() => setNewlyCreatedEventId(null)}
                          selectedEventId={selectedEventId}
                          detailPanelEventId={detailPanelEventId}
                          onEventSelect={(eventId: string | null) => {
                            setSelectedEventId(eventId);
                            if (app.state.highlightedEventId) {
                              app.highlightEvent(null);
                              prevHighlightedEventId.current = null;
                            }
                          }}
                          onEventLongPress={(eventId: string) => {
                            if (isMobile || isTouch)
                              setSelectedEventId(eventId);
                          }}
                          onDetailPanelToggle={(eventId: string | null) =>
                            setDetailPanelEventId(eventId)
                          }
                          customDetailPanelContent={customDetailPanelContent}
                          customEventDetailDialog={customEventDetailDialog}
                          multiDaySegmentInfo={segmentInfo}
                          app={app}
                          isMobile={isMobile}
                          mode={mode}
                          isCompact={isCompact}
                          enableTouch={isTouch}
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
      {contextMenu && (
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
