import { useState } from 'preact/hooks';
import { ICalendarApp } from '@/types';
import CalendarEventComponent from '@/components/calendarEvent';
import {
  Event,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  WeekDayDragState,
  ViewType,
  ViewMode,
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
import { GridContextMenu } from '@/components/contextMenu';
import { CompactHeader } from './CompactHeader';
import { scrollbarTakesSpace } from '@/utils';

interface AllDayRowProps {
  app: ICalendarApp;
  weekDaysLabels: string[];
  mobileWeekDaysLabels: string[];
  weekDates: Array<{
    date: number;
    month: string;
    fullDate: Date;
    isToday: boolean;
  }>;
  fullWeekDates?: Array<{
    date: number;
    month: string;
    fullDate: Date;
    isToday: boolean;
    isCurrent: boolean;
    dayName: string;
  }>;
  mode?: ViewMode;
  isCompact?: boolean;
  mobilePageStart?: Date;
  currentWeekStart: Date;
  gridWidth: string;
  allDayAreaHeight: number;
  organizedAllDaySegments: any[]; // Replace 'any' with specific type if possible
  allDayLabelText: string;
  isMobile: boolean;
  isTouch: boolean;
  showAllDay?: boolean;
  calendarRef: any;
  allDayRowRef: any;
  topFrozenContentRef: any;
  ALL_DAY_HEIGHT: number;
  HOUR_HEIGHT: number;
  FIRST_HOUR: number;
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
  handleCreateAllDayEvent?: (e: any, dayIndex: number) => void;
  handleDragOver: (e: any) => void;
  handleDrop: (e: any, date: Date, hour?: number, allDay?: boolean) => void;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
}

export const AllDayRow = ({
  app,
  weekDaysLabels,
  mobileWeekDaysLabels,
  weekDates,
  fullWeekDates,
  mode = 'standard',
  isCompact,
  mobilePageStart,
  currentWeekStart,
  gridWidth,
  allDayAreaHeight,
  organizedAllDaySegments,
  allDayLabelText,
  isMobile,
  isTouch,
  showAllDay = true,
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
  onDateChange,
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
}: AllDayRowProps) => {
  const columnStyle: any = { flexShrink: 0 };
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    date: Date;
  } | null>(null);
  const hasScrollbarSpace = scrollbarTakesSpace();

  const handleContextMenu = (e: any, dayIndex: number) => {
    e.preventDefault();
    if (isMobile) return;

    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + dayIndex);
    date.setHours(0, 0, 0, 0);

    setContextMenu({ x: e.clientX, y: e.clientY, date });
  };

  return (
    <div className="flex flex-col w-full">
      {/* Mobile 7-day Header with Segmented Control */}
      {(mode === 'compact' || isCompact) &&
        fullWeekDates &&
        mobilePageStart && (
          <CompactHeader
            app={app}
            fullWeekDates={fullWeekDates}
            mobilePageStart={mobilePageStart}
            onDateChange={onDateChange}
          />
        )}

      <div
        className={`flex flex-none ${showAllDay ? 'border-b border-gray-200 dark:border-gray-700' : ''} relative z-10`}
        onContextMenu={e => e.preventDefault()}
      >
        {/* Left Frozen Column - outside scroll area, matching TimeGrid sidebar */}
        {showAllDay && (
          <div
            className="w-12 md:w-20 shrink-0 bg-white dark:bg-gray-900 z-20 flex flex-col"
            onContextMenu={e => e.preventDefault()}
          >
            {/* Header spacer - flexes to match weekday header height */}
            <div
              className={`flex-1 border-b border-gray-200 dark:border-gray-700 ${mode === 'compact' || isCompact ? 'hidden' : ''}`}
            ></div>
            {/* All Day Label */}
            <div
              className="flex items-center justify-end p-1 text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400 select-none"
              style={{ minHeight: `${allDayAreaHeight}px` }}
            >
              {allDayLabelText}
            </div>
          </div>
        )}

        {/* Top Frozen Content - overflow hidden, content positioned via transform */}
        <div
          className="flex-1 overflow-hidden relative transition-[min-height] duration-300 ease-in-out"
          style={{
            scrollbarGutter: 'stable',
            minHeight: showAllDay
              ? `${allDayAreaHeight + (mode === 'compact' || isCompact ? 0 : 36)}px`
              : 'auto',
          }}
        >
          <div
            ref={topFrozenContentRef}
            className="flex flex-col"
            style={{ width: gridWidth, minWidth: '100%' }}
          >
            {/* Weekday titles row */}
            {mode !== 'compact' && !isCompact && (
              <div
                className={weekDayHeader}
                style={{
                  marginRight: hasScrollbarSpace ? '-50px' : '0px',
                  paddingRight: hasScrollbarSpace ? '50px' : '0px',
                }}
              >
                {weekDaysLabels.map((day, i) => (
                  <div
                    key={i}
                    className={`${weekDayCell} ${isMobile ? 'flex-col gap-0' : ''}`}
                    style={columnStyle}
                  >
                    {isMobile ? (
                      <>
                        <div className="text-[12px] leading-tight text-gray-500 font-medium">
                          {mobileWeekDaysLabels[i]}
                        </div>
                        <div
                          className={`${dateNumber} w-7 h-7 text-base font-medium ${weekDates[i].isToday ? miniCalendarToday : ''}`}
                        >
                          {weekDates[i].date}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="inline-flex items-center justify-center text-sm mt-1 mr-1">
                          {day}
                        </div>
                        <div
                          className={`${dateNumber} ${weekDates[i].isToday ? miniCalendarToday : ''}`}
                        >
                          {weekDates[i].date}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* All-day event area */}
            {showAllDay && (
              <div
                className={`${allDayRow} border-none transition-[min-height] duration-300 ease-in-out`}
                ref={allDayRowRef}
                style={{ minHeight: `${allDayAreaHeight}px` }}
              >
                <div
                  className={`${allDayContent} transition-[min-height] duration-300 ease-in-out`}
                  style={{ minHeight: `${allDayAreaHeight}px` }}
                >
                  {weekDaysLabels.map((_, dayIndex) => {
                    const dropDate = new Date(currentWeekStart);
                    dropDate.setDate(currentWeekStart.getDate() + dayIndex);
                    return (
                      <div
                        key={`allday-${dayIndex}`}
                        className={`${allDayCell} transition-[min-height] duration-300 ease-in-out ${dayIndex === weekDaysLabels.length - 1 && (isMobile || !hasScrollbarSpace) ? 'border-r-0' : ''}`}
                        style={{
                          minHeight: `${allDayAreaHeight}px`,
                          ...columnStyle,
                        }}
                        onClick={() => {
                          const clickedDate = new Date(currentWeekStart);
                          clickedDate.setDate(
                            currentWeekStart.getDate() + dayIndex
                          );
                          onDateChange?.(clickedDate);
                        }}
                        onMouseDown={e =>
                          handleCreateAllDayEvent?.(e, dayIndex)
                        }
                        onDblClick={e => handleCreateAllDayEvent?.(e, dayIndex)}
                        onDragOver={handleDragOver}
                        onDrop={e => {
                          handleDrop(e, dropDate, undefined, true);
                        }}
                        onContextMenu={e => handleContextMenu(e, dayIndex)}
                      />
                    );
                  })}
                  {/* Multi-day event overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {organizedAllDaySegments.map(segment => {
                      return (
                        <CalendarEventComponent
                          key={segment.event.id}
                          event={segment.event}
                          segment={segment}
                          segmentIndex={segment.row}
                          isAllDay={true}
                          isMultiDay={true}
                          allDayHeight={ALL_DAY_HEIGHT}
                          calendarRef={calendarRef}
                          viewType={ViewType.WEEK}
                          columnsPerRow={weekDaysLabels.length}
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
                            setSelectedEventId(eventId);
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
                          app={app}
                          isMobile={isMobile}
                          mode={mode}
                          isCompact={isCompact}
                          mobilePageStart={mobilePageStart}
                          enableTouch={isTouch}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
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
              const currentDayIndex = Math.floor(
                (contextMenu.date.getTime() - currentWeekStart.getTime()) /
                  (24 * 60 * 60 * 1000)
              );
              handleCreateAllDayEvent?.(
                { clientX: contextMenu.x, clientY: contextMenu.y } as any,
                currentDayIndex
              );
            }}
          />
        )}
      </div>
    </div>
  );
};
