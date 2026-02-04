import React, { useRef } from 'react';
import { CalendarApp } from '@/core';
import { useLocale } from '@/locale';
import {
  Event,
  EventLayout,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  WeekDayDragState,
  ViewType,
} from '@/types';
import ViewHeader from '@/components/common/ViewHeader';
import CalendarEventComponent from '@/components/calendarEvent';
import {
  formatTime,
  extractHourFromDate,
  getEventEndHour,
} from '@/utils';
import {
  allDayRow,
  allDayLabel,
  calendarContent,
  timeColumn,
  timeSlot,
  timeLabel,
  timeGridRow,
  currentTimeLine,
  currentTimeLabel,
  currentTimeLineBar,
  bgGray50,
  flexCol,
} from '@/styles/classNames';

interface DayContentProps {
  app: CalendarApp;
  currentDate: Date;
  currentWeekStart: Date;
  events: Event[];
  currentDayEvents: Event[];
  organizedAllDayEvents: Array<Event & { row: number }>;
  allDayAreaHeight: number;
  timeSlots: Array<{ hour: number; label: string }>;
  eventLayouts: Map<string, EventLayout>;
  isToday: boolean;
  currentTime: Date | null;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  newlyCreatedEventId: string | null;
  setNewlyCreatedEventId: (id: string | null) => void;
  detailPanelEventId: string | null;
  setDetailPanelEventId: (id: string | null) => void;
  dragState: any;
  isDragging: boolean;
  handleMoveStart: any;
  handleResizeStart: any;
  handleCreateStart: any;
  handleCreateAllDayEvent: any;
  handleTouchStart: any;
  handleTouchEnd: any;
  handleTouchMove: any;
  handleDragOver: any;
  handleDrop: any;
  handleEventUpdate: (event: Event) => void;
  handleEventDelete: (id: string) => void;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  calendarRef: React.RefObject<HTMLDivElement>;
  allDayRowRef: React.RefObject<HTMLDivElement>;
  switcherMode: string;
  isMobile: boolean;
  isTouch: boolean;
  setDraftEvent: (event: Event | null) => void;
  setIsDrawerOpen: (isOpen: boolean) => void;
  ALL_DAY_HEIGHT: number;
  HOUR_HEIGHT: number;
  FIRST_HOUR: number;
  LAST_HOUR: number;
}

export const DayContent: React.FC<DayContentProps> = ({
  app,
  currentDate,
  currentWeekStart,
  events,
  currentDayEvents,
  organizedAllDayEvents,
  allDayAreaHeight,
  timeSlots,
  eventLayouts,
  isToday,
  currentTime,
  selectedEventId,
  setSelectedEventId,
  newlyCreatedEventId,
  setNewlyCreatedEventId,
  detailPanelEventId,
  setDetailPanelEventId,
  dragState,
  isDragging,
  handleMoveStart,
  handleResizeStart,
  handleCreateStart,
  handleCreateAllDayEvent,
  handleTouchStart,
  handleTouchEnd,
  handleTouchMove,
  handleDragOver,
  handleDrop,
  handleEventUpdate,
  handleEventDelete,
  customDetailPanelContent,
  customEventDetailDialog,
  calendarRef,
  allDayRowRef,
  switcherMode,
  isMobile,
  isTouch,
  setDraftEvent,
  setIsDrawerOpen,
  ALL_DAY_HEIGHT,
  HOUR_HEIGHT,
  FIRST_HOUR,
  LAST_HOUR,
}) => {
  const { t, locale } = useLocale();
  const prevHighlightedEventId = React.useRef(app.state.highlightedEventId);

  return (
    <div
      className={`flex-none ${switcherMode === 'buttons' ? '' : 'md:w-[60%]'} w-full md:w-[70%] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700`}
    >
      <div className={`relative ${flexCol} h-full`}>
        {/* Fixed navigation bar */}
        <ViewHeader
          calendar={app}
          viewType={ViewType.DAY}
          currentDate={currentDate}
          customSubtitle={currentDate.toLocaleDateString(locale, {
            weekday: 'long',
          })}
        />
        {/* All-day event area */}
        <div className={`${allDayRow} pt-px`} ref={allDayRowRef}>
          <div className={`${allDayLabel} w-12 text-[10px] md:w-20 md:text-xs`}>{t('allDay')}</div>
          <div className="flex flex-1 relative">
            <div
              className="w-full relative"
              style={{ minHeight: `${allDayAreaHeight}px` }}
              onMouseDown={e => {
                const currentDayIndex = Math.floor(
                  (currentDate.getTime() - currentWeekStart.getTime()) /
                  (24 * 60 * 60 * 1000)
                );
                handleCreateAllDayEvent?.(e, currentDayIndex);
              }}
              onDoubleClick={e => {
                const currentDayIndex = Math.floor(
                  (currentDate.getTime() - currentWeekStart.getTime()) /
                  (24 * 60 * 60 * 1000)
                );
                handleCreateAllDayEvent?.(e, currentDayIndex);
              }}
              onDragOver={handleDragOver}
              onDrop={e => {
                handleDrop(e, currentDate, undefined, true);
              }}
            >
              {organizedAllDayEvents.map(event => (
                <CalendarEventComponent
                  key={event.id}
                  event={event}
                  isAllDay={true}
                  isDayView={true}
                  segmentIndex={event.row}
                  allDayHeight={ALL_DAY_HEIGHT}
                  calendarRef={calendarRef}
                  isBeingDragged={
                    isDragging &&
                    (dragState as WeekDayDragState)?.eventId === event.id &&
                    (dragState as WeekDayDragState)?.mode === 'move'
                  }
                  hourHeight={HOUR_HEIGHT}
                  firstHour={FIRST_HOUR}
                  onMoveStart={handleMoveStart}
                  onEventUpdate={handleEventUpdate}
                  onEventDelete={handleEventDelete}
                  newlyCreatedEventId={newlyCreatedEventId}
                  onDetailPanelOpen={() => setNewlyCreatedEventId(null)}
                  detailPanelEventId={detailPanelEventId}
                  onDetailPanelToggle={(eventId: string | null) =>
                    setDetailPanelEventId(eventId)
                  }
                  selectedEventId={selectedEventId}
                  onEventSelect={(eventId: string | null) => {
                    const isViewable = app.getReadOnlyConfig().viewable !== false;
                    const isReadOnly = app.state.readOnly;
                    const evt = events.find(e => e.id === eventId);
                    if ((isMobile || isTouch) && evt && isViewable && !isReadOnly) {
                      setDraftEvent(evt);
                      setIsDrawerOpen(true);
                    } else {
                      setSelectedEventId(eventId);
                      if (app.state.highlightedEventId) {
                        app.highlightEvent(null);
                        prevHighlightedEventId.current = null;
                      }
                    }
                  }}
                  onEventLongPress={(eventId: string) => {
                    if (isMobile || isTouch) {
                      setSelectedEventId(eventId);
                    }
                  }}
                  customDetailPanelContent={customDetailPanelContent}
                  customEventDetailDialog={customEventDetailDialog}
                  app={app}
                  isMobile={isMobile}
                  enableTouch={isTouch}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Time grid and event area */}
        <div className={calendarContent} style={{ position: 'relative' }}>
          <div className="relative flex">
            {/* Current time line */}
            {isToday && currentTime &&
              (() => {
                const now = currentTime;
                const hours = now.getHours() + now.getMinutes() / 60;
                if (hours < FIRST_HOUR || hours > LAST_HOUR) return null;

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
                      className="flex items-center w-12 md:w-20"
                    >
                      <div className="relative w-full flex items-center"></div>
                      <div className={currentTimeLabel}>
                        {formatTime(hours)}
                      </div>
                    </div>

                    <div className="flex-1 flex items-center">
                      <div className={currentTimeLineBar} />
                    </div>
                  </div>
                );
              })()}

            {/* Time column */}
            <div className={`${timeColumn} w-12 md:w-20`}>
              {timeSlots.map((slot, slotIndex) => (
                <div key={slotIndex} className={timeSlot}>
                  <div className={`${timeLabel} text-[10px] md:text-[12px]`}>
                    {slotIndex === 0 ? '' : slot.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div
              className="grow relative select-none"
              style={{ WebkitTouchCallout: 'none' }}
            >
              {timeSlots.map((slot, slotIndex) => (
                <div
                  key={slotIndex}
                  className={timeGridRow}
                  onDoubleClick={e => {
                    const currentDayIndex = Math.floor(
                      (currentDate.getTime() - currentWeekStart.getTime()) /
                      (24 * 60 * 60 * 1000)
                    );
                    const rect = calendarRef.current
                      ?.querySelector('.calendar-content')
                      ?.getBoundingClientRect();
                    if (!rect) return;
                    const relativeY =
                      e.clientY -
                      rect.top +
                      (
                        calendarRef.current?.querySelector(
                          '.calendar-content'
                        ) as HTMLElement
                      )?.scrollTop || 0;
                    const clickedHour = FIRST_HOUR + relativeY / HOUR_HEIGHT;
                    handleCreateStart?.(e, currentDayIndex, clickedHour);
                  }}
                  onTouchStart={e => {
                    const currentDayIndex = Math.floor(
                      (currentDate.getTime() - currentWeekStart.getTime()) /
                      (24 * 60 * 60 * 1000)
                    );
                    handleTouchStart(e, currentDayIndex);
                  }}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  onDragOver={handleDragOver}
                  onDrop={e => {
                    const rect = calendarRef.current
                      ?.querySelector('.calendar-content')
                      ?.getBoundingClientRect();
                    if (!rect) return;
                    const relativeY =
                      e.clientY -
                      rect.top +
                      (
                        calendarRef.current?.querySelector(
                          '.calendar-content'
                        ) as HTMLElement
                      )?.scrollTop || 0;
                    const dropHour = Math.floor(FIRST_HOUR + relativeY / HOUR_HEIGHT);
                    handleDrop(e, currentDate, dropHour);
                  }}
                  onContextMenu={e => isMobile && e.preventDefault()}
                />
              ))}

              {/* Bottom boundary */}
              <div className="h-3 border-t border-gray-200 dark:border-gray-700 relative">
                <div className="absolute -top-2.5 -left-9 text-[12px] text-gray-500 dark:text-gray-400">
                  00:00
                </div>
              </div>

              {/* Event layer */}
              <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                {currentDayEvents
                  .filter(event => !event.allDay)
                  .map(event => {
                    const eventLayout = eventLayouts.get(event.id);
                    return (
                      <CalendarEventComponent
                        key={event.id}
                        event={event}
                        layout={eventLayout}
                        isDayView={true}
                        calendarRef={calendarRef}
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
                        detailPanelEventId={detailPanelEventId}
                        onDetailPanelToggle={(eventId: string | null) =>
                          setDetailPanelEventId(eventId)
                        }
                        selectedEventId={selectedEventId}
                        onEventSelect={(eventId: string | null) => {
                          const isViewable = app.getReadOnlyConfig().viewable !== false;
                          const evt = events.find(e => e.id === eventId);
                          if ((isMobile || isTouch) && evt && isViewable) {
                            setDraftEvent(evt);
                            setIsDrawerOpen(true);
                          } else {
                            setSelectedEventId(eventId);
                            if (app.state.highlightedEventId) {
                              app.highlightEvent(null);
                              prevHighlightedEventId.current = null;
                            }
                          }
                        }}
                        onEventLongPress={(eventId: string) => {
                          if (isMobile || isTouch) {
                            setSelectedEventId(eventId);
                          }
                        }}
                        customDetailPanelContent={customDetailPanelContent}
                        customEventDetailDialog={customEventDetailDialog}
                        app={app}
                        isMobile={isMobile}
                        enableTouch={isTouch}
                      />
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
