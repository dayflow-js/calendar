import { RefObject, JSX } from 'preact';
import { useEffect, useState, useMemo } from 'preact/hooks';

import CalendarEventComponent from '@/components/calendarEvent';
import { GridContextMenu } from '@/components/contextMenu';
import { MultiDayEventSegment } from '@/components/monthView/util';
import {
  allDayRow,
  allDayLabel,
  allDayContent,
  allDayCell,
  weekDayHeader,
  weekDayCell,
  dateNumber,
} from '@/styles/classNames';
import { Event, WeekDayDragState, ViewType, ICalendarApp } from '@/types';
import {
  getEventsForDay,
  getAllDayEventsForDay,
  scrollbarTakesSpace,
} from '@/utils';

import { CompactHeader } from './CompactHeader';

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
  isSlidingView?: boolean;
  mobilePageStart?: Date;
  currentWeekStart: Date;
  currentWeekEvents: Event[];
  gridWidth: string;
  allDayAreaHeight: number;
  organizedAllDaySegments: Array<MultiDayEventSegment & { row: number }>;
  allDayLabelText: string;
  isMobile: boolean;
  isTouch: boolean;
  showAllDay?: boolean;
  calendarRef: RefObject<HTMLDivElement>;
  allDayRowRef: RefObject<HTMLDivElement>;
  topFrozenContentRef: RefObject<HTMLDivElement>;
  ALL_DAY_HEIGHT: number;
  HOUR_HEIGHT: number;
  FIRST_HOUR: number;
  dragState: WeekDayDragState | null;
  isDragging: boolean;
  primaryTzLabel?: string;
  secondaryTzLabel?: string;
  secondaryTimeSlots?: string[];
  handleMoveStart: (e: MouseEvent | TouchEvent, event: Event) => void;
  handleResizeStart: (
    e: MouseEvent | TouchEvent,
    event: Event,
    direction: string
  ) => void;
  handleEventUpdate: (event: Event) => void;
  handleEventDelete: (id: string) => void;
  setDraftEvent: (event: Event | null) => void;
  setIsDrawerOpen: (isOpen: boolean) => void;
  onDateChange?: (date: Date) => void;
  onGridDateClick?: (date: Date, events: Event[]) => void;
  onGridDateDoubleClick?: (date: Date, events: Event[]) => void;
  newlyCreatedEventId: string | null;
  setNewlyCreatedEventId: (id: string | null) => void;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  detailPanelEventId: string | null;
  setDetailPanelEventId: (id: string | null) => void;
  handleCreateAllDayEvent?: (
    e: MouseEvent | TouchEvent,
    dayIndex: number
  ) => void;
  handleDragOver: (e: DragEvent) => void;
  handleDrop: (
    e: DragEvent,
    date: Date,
    hour?: number,
    allDay?: boolean
  ) => void;
  useEventDetailPanel?: boolean;
}

export const AllDayRow = (props: AllDayRowProps) => {
  const {
    app,
    weekDaysLabels,
    mobileWeekDaysLabels,
    weekDates,
    fullWeekDates,
    isSlidingView,
    mobilePageStart,
    currentWeekStart,
    currentWeekEvents,
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
    primaryTzLabel,
    secondaryTzLabel,
    secondaryTimeSlots,
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
    handleCreateAllDayEvent,
    handleDragOver,
    handleDrop,
    useEventDetailPanel,
  } = props;
  const columnStyle: JSX.CSSProperties = { flexShrink: 0 };
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    date: Date;
  } | null>(null);
  const hasScrollbarSpace = useMemo(() => scrollbarTakesSpace(), []);
  const hasSecondaryTz = !!secondaryTimeSlots && secondaryTimeSlots.length > 0;
  // On mobile the time column is too narrow for dual labels — hide secondary TZ display
  const showSecondaryTz = hasSecondaryTz && !isMobile;
  const isEditable = app.canMutateFromUI();

  useEffect(() => {
    if (isEditable) return;
    setContextMenu(null);
  }, [isEditable]);

  const handleContextMenu = (e: MouseEvent, dayIndex: number) => {
    e.preventDefault();
    if (isMobile || !isEditable) return;

    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + dayIndex);
    date.setHours(0, 0, 0, 0);

    setContextMenu({ x: e.clientX, y: e.clientY, date });
  };

  return (
    <div className='df-week-all-day'>
      {/* Mobile 7-day Header with Segmented Control */}
      {isSlidingView && fullWeekDates && mobilePageStart && (
        <CompactHeader
          app={app}
          fullWeekDates={fullWeekDates}
          mobilePageStart={mobilePageStart}
          onDateChange={onDateChange}
        />
      )}

      <div
        className='df-week-all-day-shell'
        data-show-all-day={showAllDay ? 'true' : 'false'}
        onContextMenu={e => e.preventDefault()}
      >
        {/* Left Frozen Column - outside scroll area, matching TimeGrid sidebar */}
        {showAllDay && (
          <div
            className='df-week-all-day-side'
            onContextMenu={e => e.preventDefault()}
          >
            {/* Header spacer - flexes to match weekday header height */}
            <div
              className='df-week-all-day-side-spacer'
              data-sliding-view={isSlidingView ? 'true' : 'false'}
            >
              {/* Timezone header: secondary LEFT, primary RIGHT */}
              {showSecondaryTz && (
                <div className='df-time-column-tz-header df-time-column-tz-header-compact'>
                  <span className='df-time-column-tz-label'>
                    {secondaryTzLabel}
                  </span>
                  <span className='df-time-column-tz-label'>
                    {primaryTzLabel}
                  </span>
                </div>
              )}
            </div>
            {/* All Day Label */}
            <div
              className={`${allDayLabel} df-week-all-day-label`}
              style={{ minHeight: `${allDayAreaHeight}px` }}
            >
              {allDayLabelText}
            </div>
          </div>
        )}

        {/* Top Frozen Content - overflow hidden, content positioned via transform */}
        <div
          className='df-week-all-day-content-wrap'
          style={{
            scrollbarGutter: 'stable',
            minHeight: showAllDay
              ? `${allDayAreaHeight + (isSlidingView ? 0 : 36)}px`
              : 'auto',
          }}
        >
          <div
            ref={topFrozenContentRef}
            className='df-week-all-day-content'
            style={{
              width: gridWidth,
              minWidth: '100%',
              transform: isSlidingView
                ? 'translateX(calc(-100% / 3))'
                : undefined,
            }}
          >
            {/* Weekday titles row */}
            {!isSlidingView && (
              <div
                className={weekDayHeader}
                data-scrollbar-space={hasScrollbarSpace ? 'true' : 'false'}
                style={{
                  marginRight: hasScrollbarSpace ? '-50px' : '0px',
                  paddingRight: hasScrollbarSpace ? '50px' : '0px',
                }}
              >
                {weekDaysLabels.map((day, i) => (
                  <div
                    key={i}
                    className={`${weekDayCell} df-week-all-day-weekday-cell`}
                    data-mobile={isMobile ? 'true' : 'false'}
                    style={columnStyle}
                  >
                    {isMobile ? (
                      <>
                        <div className='df-week-all-day-weekday-label'>
                          {mobileWeekDaysLabels[i]}
                        </div>
                        <div
                          className={`${dateNumber} df-week-all-day-date-number df-week-all-day-date-number-mobile`}
                          data-today={weekDates[i].isToday ? 'true' : undefined}
                        >
                          {weekDates[i].date}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className='df-week-all-day-weekday-name'>
                          {day}
                        </div>
                        <div
                          className={`${dateNumber} df-week-all-day-date-number`}
                          data-today={weekDates[i].isToday ? 'true' : undefined}
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
                className={`${allDayRow} df-week-all-day-row`}
                ref={allDayRowRef}
                style={{ minHeight: `${allDayAreaHeight}px` }}
              >
                <div
                  className={`${allDayContent} df-week-all-day-row-content`}
                  data-scrollbar-space={
                    isMobile || !hasScrollbarSpace ? 'false' : 'true'
                  }
                  style={{ minHeight: `${allDayAreaHeight}px` }}
                >
                  {weekDaysLabels.map((_, dayIndex) => {
                    const dropDate = new Date(currentWeekStart);
                    dropDate.setDate(currentWeekStart.getDate() + dayIndex);
                    return (
                      <div
                        key={`allday-${dayIndex}`}
                        className={`${allDayCell} df-week-all-day-cell ${dayIndex === weekDaysLabels.length - 1 && (isMobile || !hasScrollbarSpace) ? 'df-week-all-day-cell-no-border' : ''}`}
                        style={{
                          minHeight: `${allDayAreaHeight}px`,
                          ...columnStyle,
                        }}
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
                        onMouseDown={e =>
                          handleCreateAllDayEvent?.(e, dayIndex)
                        }
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
                            handleCreateAllDayEvent?.(e, dayIndex);
                          }
                        }}
                        onDragOver={handleDragOver}
                        onDrop={e => {
                          handleDrop(e, dropDate, undefined, true);
                        }}
                        onContextMenu={e => handleContextMenu(e, dayIndex)}
                      />
                    );
                  })}
                  {/* Multi-day event overlay */}
                  <div className='df-week-all-day-event-layer'>
                    {organizedAllDaySegments.map(segment => (
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
                          const isViewable =
                            app.getReadOnlyConfig(eventId ?? undefined)
                              .viewable !== false;
                          const evt = organizedAllDaySegments.find(
                            currentSegment =>
                              currentSegment.event.id === eventId
                          )?.event;

                          if ((isMobile || isTouch) && evt && isViewable) {
                            setDraftEvent(evt);
                            setIsDrawerOpen(true);
                            return;
                          }

                          setSelectedEventId(eventId);
                        }}
                        onEventLongPress={(eventId: string) => {
                          if (isMobile || isTouch) setSelectedEventId(eventId);
                        }}
                        onDetailPanelToggle={(eventId: string | null) =>
                          setDetailPanelEventId(eventId)
                        }
                        useEventDetailPanel={useEventDetailPanel}
                        app={app}
                        isMobile={isMobile}
                        isSlidingView={isSlidingView}
                        enableTouch={isTouch}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
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
              const currentDayIndex = Math.floor(
                (contextMenu.date.getTime() - currentWeekStart.getTime()) /
                  (24 * 60 * 60 * 1000)
              );
              handleCreateAllDayEvent?.(
                {
                  clientX: contextMenu.x,
                  clientY: contextMenu.y,
                } as MouseEvent,
                currentDayIndex
              );
            }}
          />
        )}
      </div>
    </div>
  );
};
