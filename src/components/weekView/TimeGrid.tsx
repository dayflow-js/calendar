import React, { useEffect, useState } from 'react';
import { CalendarApp } from '@/core';
import CalendarEventComponent from '@/components/calendarEvent';
import {
  formatTime,
  getEventsForDay,
  extractHourFromDate,
} from '@/utils';
import { useLocale } from '@/locale';
import {
  EventLayout,
  Event,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  WeekDayDragState,
} from '@/types';
import {
  timeSlot,
  timeLabel,
  timeGridRow,
  timeGridCell,
  currentTimeLine,
  currentTimeLabel,
} from '@/styles/classNames';
import { analyzeMultiDayRegularEvent } from '@/components/monthView/util';

interface TimeGridProps {
  app: CalendarApp;
  timeSlots: Array<{ hour: number; label: string }>;
  weekDaysLabels: string[];
  currentWeekStart: Date;
  currentWeekEvents: Event[];
  eventLayouts: Map<number, Map<string, EventLayout>>;
  gridWidth: string;
  isMobile: boolean;
  isTouch: boolean;
  scrollerRef: React.RefObject<HTMLDivElement>;
  timeGridRef: React.RefObject<HTMLDivElement>;
  leftFrozenContentRef: React.RefObject<HTMLDivElement>;
  calendarRef: React.RefObject<HTMLDivElement>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  handleCreateStart?: (e: React.MouseEvent | React.TouchEvent, dayIndex: number, hour: number) => void;
  handleTouchStart: (e: React.TouchEvent, dayIndex: number, hour: number) => void;
  handleTouchEnd: () => void;
  handleTouchMove: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, date: Date, hour?: number, allDay?: boolean) => void;
  dragState: any;
  isDragging: boolean;
  handleMoveStart: any;
  handleResizeStart: any;
  handleEventUpdate: (event: Event) => void;
  handleEventDelete: (id: string) => void;
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
}

export const TimeGrid: React.FC<TimeGridProps> = ({
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
}) => {
  const columnStyle: React.CSSProperties = { flexShrink: 0 };
  const prevHighlightedEventId = React.useRef(app.state.highlightedEventId);

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Left Frozen Column */}
      <div className="w-12 md:w-20 shrink-0 overflow-hidden relative bg-white dark:bg-gray-900 z-10">
        <div ref={leftFrozenContentRef}>
          {timeSlots.map((slot, slotIndex) => (
            <div key={slotIndex} className={timeSlot}>
              <div className={`${timeLabel} text-[10px] md:text-[12px]`}>
                {slotIndex === 0 ? '' : slot.label}
              </div>
            </div>
          ))}
          <div className="relative">
            <div className={`${timeLabel} text-[10px] md:text-[12px]`}>00:00</div>
          </div>
          {/* Current Time Label */}
          {isCurrentWeek && currentTime &&
            (() => {
              const now = currentTime;
              const hours = now.getHours() + now.getMinutes() / 60;
              if (hours < FIRST_HOUR || hours > LAST_HOUR) return null;

              const topPx = (hours - FIRST_HOUR) * HOUR_HEIGHT;

              return (
                <div
                  className="absolute left-0 w-full z-20 pointer-events-none flex items-center justify-end"
                  style={{ top: `${topPx}px`, transform: 'translateY(-50%)' }}
                >
                  <div className={currentTimeLabel}>{formatTime(hours)}</div>
                </div>
              );
            })()}
        </div>
      </div>

      {/* Scroller */}
      <div ref={scrollerRef} className="flex-1 overflow-auto relative calendar-content snap-x snap-mandatory" onScroll={handleScroll}>
        <div ref={timeGridRef} className="relative flex" style={{ width: gridWidth, minWidth: '100%' }}>
          {/* Current time line */}
          {isCurrentWeek && currentTime &&
            (() => {
              const now = currentTime;
              const hours = now.getHours() + now.getMinutes() / 60;
              if (hours < FIRST_HOUR || hours > LAST_HOUR) return null;

              const jsDay = now.getDay();
              const todayIndex = jsDay === 0 ? 6 : jsDay - 1;
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
                  <div
                    className="flex items-center w-0"
                  >
                    {/* Empty left part since it is in frozen column now */}
                  </div>

                  <div className="flex flex-1">
                    {weekDaysLabels.map((_, idx) => (
                      <div key={idx} className="flex-1 flex items-center" >
                        <div
                          className={`h-0.5 w-full relative ${idx === todayIndex
                            ? 'bg-primary'
                            : 'bg-primary/30'
                            }`} style={{
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

          {/* Time Grid */}
          <div className="grow relative">
            {timeSlots.map((slot, slotIndex) => (
              <div key={slotIndex} className={timeGridRow}>
                {weekDaysLabels.map((_, dayIndex) => {
                  const dropDate = new Date(currentWeekStart);
                  dropDate.setDate(currentWeekStart.getDate() + dayIndex);
                  return (
                    <div
                      key={`${slotIndex}-${dayIndex}`}
                      className={`${timeGridCell} snap-start ${isMobile && dayIndex === weekDaysLabels.length - 1 ? 'border-r-0' : ''}`}
                      style={columnStyle}
                      onDoubleClick={e => {
                        handleCreateStart?.(e, dayIndex, slot.hour);
                      }}
                      onTouchStart={e => handleTouchStart(e, dayIndex, slot.hour)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchMove}
                      onDragOver={handleDragOver}
                      onDrop={e => {
                        handleDrop(e, dropDate, slot.hour);
                      }}
                      onContextMenu={e => isMobile && e.preventDefault()}
                    />
                  );
                })}
              </div>
            ))}

            {/* Bottom boundary */}
            <div className="h-3 border-t border-gray-200 dark:border-gray-700 flex relative">
              {weekDaysLabels.map((_, dayIndex) => (
                <div
                  key={`24-${dayIndex}`}
                  className={`flex-1 relative ${isMobile && dayIndex === weekDaysLabels.length - 1 ? '' : 'border-r'} border-gray-200 dark:border-gray-700`}
                  style={columnStyle}
                />
              ))}
            </div>

            {/* Event layer */}
            {weekDaysLabels.map((_, dayIndex) => {
              // Collect all event segments for this day
              const dayEvents = getEventsForDay(dayIndex, currentWeekEvents);
              const allEventSegments: Array<{
                event: Event;
                segmentInfo?: { startHour: number; endHour: number; isFirst: boolean; isLast: boolean; dayIndex?: number };
              }> = [];

              dayEvents.forEach(event => {
                const segments = analyzeMultiDayRegularEvent(event, currentWeekStart);
                if (segments.length > 0) {
                  const segment = segments.find(s => s.dayIndex === dayIndex);
                  if (segment) {
                    allEventSegments.push({ event, segmentInfo: { ...segment, dayIndex } });
                  }
                } else {
                  allEventSegments.push({ event });
                }
              });

              currentWeekEvents.forEach(event => {
                if (event.allDay || event.day === dayIndex) return;
                const segments = analyzeMultiDayRegularEvent(event, currentWeekStart);
                const segment = segments.find(s => s.dayIndex === dayIndex);
                if (segment) {
                  allEventSegments.push({ event, segmentInfo: { ...segment, dayIndex } });
                }
              });

              return (
                <div
                  key={`events-day-${dayIndex}`}
                  className="absolute top-0 pointer-events-none"
                  style={{
                    left: `calc(${(100 / 7) * dayIndex}%)`,
                    width: `${100 / 7}%`,
                    height: '100%',
                  }}
                >
                  {allEventSegments.map(({ event, segmentInfo }) => {
                    const dayLayouts = eventLayouts.get(dayIndex);
                    const eventLayout = dayLayouts?.get(event.id);

                    return (
                      <CalendarEventComponent
                        key={segmentInfo ? `${event.id}-seg-${dayIndex}` : event.id}
                        event={event}
                        layout={eventLayout}
                        calendarRef={calendarRef}
                        isBeingDragged={
                          isDragging &&
                          (dragState as WeekDayDragState)?.eventId === event.id &&
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
                          const isViewable = app.getReadOnlyConfig().viewable !== false;
                          const isReadOnly = app.state.readOnly;
                          if ((isMobile || isTouch) && eventId && isViewable && !isReadOnly) {
                            const evt = events.find(e => e.id === eventId);
                            if (evt) {
                              setDraftEvent(evt);
                              setIsDrawerOpen(true);
                              return;
                            }
                          }
                          setSelectedEventId(eventId);
                          if (app.state.highlightedEventId) {
                            app.highlightEvent(null);
                            prevHighlightedEventId.current = null;
                          }
                        }}
                        onEventLongPress={(eventId: string) => {
                          if (isMobile || isTouch) setSelectedEventId(eventId);
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
  );
};
