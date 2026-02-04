import React, { useMemo } from 'react';
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
import { useResponsiveMonthConfig } from '@/hooks/virtualScroll';

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
  sidebarWidth: number;
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
  sidebarWidth,
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
      {/* Top Frozen Content */}
      <div ref={topFrozenContentRef} className="flex-1 overflow-hidden relative">
        <div className="flex flex-col min-w-full">
          {/* Weekday titles row */}
          <div className="flex w-full">
            <div className="flex shrink-0" style={{
              width: timeGridWidth ? timeGridWidth + sidebarWidth : '100%',
            }}>
              {/* Header Spacer */}
              <div className="w-12 md:w-20 shrink-0 sticky left-0 bg-white dark:bg-gray-900 z-20 border-b border-gray-200 dark:border-gray-700"></div>
              {/* Weekday titles */}
              <div className={`${weekDayHeader} flex-1`}>
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
            </div>
            {/* Filler for Weekday Header */}
            <div className="flex-1 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"></div>
          </div>

          {/* All-day event area row */}
          <div className="flex w-full">
            <div className="flex shrink-0" style={{
              width: timeGridWidth ? timeGridWidth + sidebarWidth : '100%',
            }}>
              {/* All Day Label */}
              <div className="w-12 md:w-20 shrink-0 flex items-center justify-end p-1 text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400 select-none bg-white dark:bg-gray-900 sticky left-0 z-20 ">
                {allDayLabelText}
              </div>

              <div className={`${allDayRow} border-none flex-1`} ref={allDayRowRef} style={{ minHeight: `${allDayAreaHeight}px` }}>
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
            {/* Filler for All Day Row */}
            <div className="flex-1  bg-white dark:bg-gray-900"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
