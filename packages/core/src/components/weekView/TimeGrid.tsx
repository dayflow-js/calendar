import { useState, useRef } from 'preact/hooks';
import { ICalendarApp } from '@/types';
import CalendarEventComponent from '@/components/calendarEvent';
import { formatTime, getEventsForDay, scrollbarTakesSpace } from '@/utils';
import {
  EventLayout,
  Event,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  WeekDayDragState,
  ViewType,
} from '@/types';
import {
  timeSlot,
  timeLabel,
  timeGridRow,
  timeGridCell,
  currentTimeLine,
  currentTimeLabel,
  timeGridBoundary,
} from '@/styles/classNames';
import { analyzeMultiDayRegularEvent } from '@/components/monthView/util';
import { GridContextMenu } from '@/components/contextMenu';

interface TimeGridProps {
  app: ICalendarApp;
  timeSlots: Array<{ hour: number; label: string }>;
  weekDaysLabels: string[];
  currentWeekStart: Date;
  currentWeekEvents: Event[];
  eventLayouts: Map<number, Map<string, EventLayout>>;
  gridWidth: string;
  isMobile: boolean;
  isTouch: boolean;
  scrollerRef: any;
  timeGridRef: any;
  leftFrozenContentRef: any;
  calendarRef: any;
  handleScroll: (e: any) => void;
  handleCreateStart?: (e: any, dayIndex: number, hour: number) => void;
  handleTouchStart: (e: any, dayIndex: number, hour: number) => void;
  handleTouchEnd: () => void;
  handleTouchMove: () => void;
  handleDragOver: (e: any) => void;
  handleDrop: (e: any, date: Date, hour?: number, allDay?: boolean) => void;
  dragState: any;
  isDragging: boolean;
  handleMoveStart: any;
  handleResizeStart: any;
  handleEventUpdate: (event: Event) => void;
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
  events: Event[];
  setDraftEvent: (event: Event | null) => void;
  setIsDrawerOpen: (isOpen: boolean) => void;
  isCurrentWeek: boolean;
  currentTime: Date | null;
  HOUR_HEIGHT: number;
  FIRST_HOUR: number;
  LAST_HOUR: number;
  showStartOfDayLabel: boolean;
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
  events,
  setDraftEvent,
  setIsDrawerOpen,
  isCurrentWeek,
  currentTime,
  HOUR_HEIGHT,
  FIRST_HOUR,
  LAST_HOUR,
  showStartOfDayLabel,
}: TimeGridProps) => {
  const columnStyle: any = { flexShrink: 0 };
  const prevHighlightedEventId = useRef(app.state.highlightedEventId);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    date: Date;
  } | null>(null);
  const hasScrollbarSpace = scrollbarTakesSpace();

  const handleContextMenu = (e: any, dayIndex: number, hour: number) => {
    e.preventDefault();
    if (isMobile) return;

    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + dayIndex);

    if (timeGridRef.current) {
      const rect = timeGridRef.current.getBoundingClientRect();
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
    <div className="flex flex-1 overflow-hidden relative">
      {/* Left Frozen Column */}
      <div
        className="w-12 md:w-20 shrink-0 overflow-hidden relative bg-white dark:bg-gray-900 z-10"
        onContextMenu={e => e.preventDefault()}
      >
        <div ref={leftFrozenContentRef}>
          {/* Top boundary spacer with start-of-day label */}
          <div className="h-3 relative">
            <div className="absolute -bottom-1 right-2 text-[10px] md:text-[12px] text-gray-500 dark:text-gray-400 select-none">
              {showStartOfDayLabel ? formatTime(FIRST_HOUR) : ''}
            </div>
          </div>
          {timeSlots.map((slot, slotIndex) => (
            <div key={slotIndex} className={timeSlot}>
              <div className={`${timeLabel} text-[10px] md:text-[12px]`}>
                {showStartOfDayLabel && slotIndex === 0 ? '' : slot.label}
              </div>
            </div>
          ))}
          <div className="relative">
            <div className={`${timeLabel} text-[10px] md:text-[12px]`}>
              00:00
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
                  className="absolute left-0 w-full z-20 pointer-events-none flex items-center justify-end"
                  style={{
                    top: `${topPx}px`,
                    transform: 'translateY(-50%)',
                    marginTop: '0.75rem',
                  }}
                >
                  <div className={currentTimeLabel}>{formatTime(hours)}</div>
                </div>
              );
            })()}
        </div>
      </div>

      {/* Scroller */}
      <div
        ref={scrollerRef}
        className={`flex-1 overflow-auto relative calendar-content ${gridWidth === '300%' ? 'overflow-x-hidden' : 'snap-x snap-mandatory'}`}
        onScroll={handleScroll}
      >
        <div className="flex" style={{ width: gridWidth, minWidth: '100%' }}>
          {/* Time Grid */}
          <div className="grow">
            {/* Top boundary */}
            <div className={`${timeGridBoundary} border-t-0 flex`}>
              {weekDaysLabels.map((_, dayIndex) => (
                <div
                  key={`top-${dayIndex}`}
                  className={`flex-1 relative ${dayIndex === weekDaysLabels.length - 1 && (isMobile || !hasScrollbarSpace) ? '' : 'border-r'} border-gray-200 dark:border-gray-700`}
                  style={columnStyle}
                />
              ))}
            </div>
            <div ref={timeGridRef} className="relative">
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
                      <div className="flex items-center w-0">
                        {/* Empty left part since it is in frozen column now */}
                      </div>

                      <div className="flex flex-1">
                        {weekDaysLabels.map((_, idx) => (
                          <div key={idx} className="flex-1 flex items-center">
                            <div
                              className={`h-0.5 w-full relative ${
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
                                  className="absolute w-2 h-2 bg-primary rounded-full"
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
                    className={`flex-1 relative ${dayIndex === weekDaysLabels.length - 1 && (isMobile || !hasScrollbarSpace) ? '' : 'border-r'} border-gray-200 dark:border-gray-700`}
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
                  event: Event;
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
                    className="absolute top-0 pointer-events-none"
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
                preventDefault: () => {},
                stopPropagation: () => {},
                clientX: contextMenu.x,
                clientY: contextMenu.y,
              } as unknown as any;

              handleCreateStart(syntheticEvent, diffDays, preciseHour);
            }
          }}
        />
      )}
    </div>
  );
};
