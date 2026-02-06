import React from 'react';
import { CalendarApp } from '@/core';
import CalendarEventComponent from '@/components/calendarEvent';
import { useLocale } from '@/locale';
import {
  Event,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  WeekDayDragState,
} from '@/types';
import {
  allDayRow,
  allDayContent,
  allDayCell,
  weekDayHeader,
  weekDayCell,
  dateNumber,
  miniCalendarToday,
} from '@/styles/classNames';

interface AllDayRowProps {
  app: CalendarApp;
  weekDaysLabels: string[];
  mobileWeekDaysLabels: string[];
  weekDates: Array<{
    date: number;
    month: string;
    fullDate: Date;
    isToday: boolean;
  }>;
  currentWeekStart: Date;
  timeGridWidth: number;
  allDayAreaHeight: number;
  organizedAllDaySegments: any[]; // Replace 'any' with specific type if possible
  allDayLabelText: string;
  isMobile: boolean;
  isTouch: boolean;
  calendarRef: React.RefObject<HTMLDivElement>;
  allDayRowRef: React.RefObject<HTMLDivElement>;
  topFrozenContentRef: React.RefObject<HTMLDivElement>;
  ALL_DAY_HEIGHT: number;
  HOUR_HEIGHT: number;
  FIRST_HOUR: number;
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
  handleCreateAllDayEvent?: (e: React.MouseEvent, dayIndex: number) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, date: Date, hour?: number, allDay?: boolean) => void;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  events: Event[];
  setDraftEvent: (event: Event | null) => void;
  setIsDrawerOpen: (isOpen: boolean) => void;
}

export const AllDayRow: React.FC<AllDayRowProps> = ({
  app,
  weekDaysLabels,
  mobileWeekDaysLabels,
  weekDates,
  currentWeekStart,
  timeGridWidth,
  allDayAreaHeight,
  organizedAllDaySegments,
  allDayLabelText,
  isMobile,
  isTouch,
  calendarRef,
  allDayRowRef,
  topFrozenContentRef,
  ALL_DAY_HEIGHT,
  HOUR_HEIGHT,
  FIRST_HOUR,
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
  handleCreateAllDayEvent,
  handleDragOver,
  handleDrop,
  customDetailPanelContent,
  customEventDetailDialog,
  events,
  setDraftEvent,
  setIsDrawerOpen,
}) => {
  const columnStyle: React.CSSProperties = { flexShrink: 0 };

  return (
    <div className="flex flex-none border-b border-gray-200 dark:border-gray-700 relative z-10">
      {/* Left Frozen Column - outside scroll area, matching TimeGrid sidebar */}
      <div className="w-12 md:w-20 shrink-0 bg-white dark:bg-gray-900 z-20 flex flex-col">
        {/* Header spacer - flexes to match weekday header height */}
        <div className="flex-1 border-b border-gray-200 dark:border-gray-700"></div>
        {/* All Day Label */}
        <div className="flex items-center justify-end p-1 text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400 select-none"
          style={{ minHeight: `${allDayAreaHeight}px` }}>
          {allDayLabelText}
        </div>
      </div>

      {/* Top Frozen Content - overflow hidden, content positioned via transform */}
      <div className="flex-1 overflow-hidden relative">
        <div ref={topFrozenContentRef} className="flex flex-col"
          style={{ width: timeGridWidth || undefined, minWidth: '100%' }}>
          {/* Weekday titles row */}
          <div className={weekDayHeader}>
            {weekDaysLabels.map((day, i) => (
              <div
                key={i}
                className={`${weekDayCell} ${isMobile ? 'flex-col gap-0' : ''}`}
                style={columnStyle}
              >
                {isMobile ? (
                  <>
                    <div className="text-[11px] leading-tight text-gray-500 font-medium">
                      {mobileWeekDaysLabels[i]}
                    </div>
                    <div className={`${dateNumber} w-7 h-7 text-base font-medium ${weekDates[i].isToday ? miniCalendarToday : ''}`}>
                      {weekDates[i].date}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center justify-center text-sm mt-1 mr-1">
                      {day}
                    </div>
                    <div className={`${dateNumber} ${weekDates[i].isToday ? miniCalendarToday : ''}`}>
                      {weekDates[i].date}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* All-day event area */}
          <div className={`${allDayRow} border-none`} ref={allDayRowRef} style={{ minHeight: `${allDayAreaHeight}px` }}>
            <div className={allDayContent} style={{ minHeight: `${allDayAreaHeight}px` }}>
              {weekDaysLabels.map((_, dayIndex) => {
                const dropDate = new Date(currentWeekStart);
                dropDate.setDate(currentWeekStart.getDate() + dayIndex);
                return (
                  <div
                    key={`allday-${dayIndex}`}
                    className={`${allDayCell} ${isMobile && dayIndex === weekDaysLabels.length - 1 ? 'border-r-0' : ''}`}
                    style={{ minHeight: `${allDayAreaHeight}px`, ...columnStyle }}
                    onMouseDown={e => handleCreateAllDayEvent?.(e, dayIndex)}
                    onDoubleClick={e => handleCreateAllDayEvent?.(e, dayIndex)}
                    onDragOver={handleDragOver}
                    onDrop={e => {
                      handleDrop(e, dropDate, undefined, true);
                    }}
                  />
                );
              })}
              {/* Multi-day event overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {organizedAllDaySegments.map(segment => {
                  return (
                    <CalendarEventComponent
                      key={segment.id}
                      event={segment.event}
                      segment={segment}
                      segmentIndex={segment.row}
                      isAllDay={true}
                      isMultiDay={true}
                      allDayHeight={ALL_DAY_HEIGHT}
                      calendarRef={calendarRef}
                      isBeingDragged={
                        isDragging &&
                        (dragState as WeekDayDragState)?.eventId ===
                        segment.event.id &&
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
                        } setSelectedEventId(eventId);
                      }}
                      onEventLongPress={(eventId: string) => {
                        if (isMobile || isTouch) setSelectedEventId(eventId);
                      }}
                      onDetailPanelToggle={(eventId: string | null) =>
                        setDetailPanelEventId(eventId)
                      }
                      customDetailPanelContent={customDetailPanelContent}
                      customEventDetailDialog={customEventDetailDialog}
                      app={app}
                      isMobile={isMobile}
                      enableTouch={isTouch}
                    />);
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
