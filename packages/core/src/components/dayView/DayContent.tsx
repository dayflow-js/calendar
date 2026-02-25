import { useRef, useState } from 'preact/hooks';
import { ICalendarApp } from '@/types';
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
import { formatTime, scrollbarTakesSpace } from '@/utils';
import { GridContextMenu } from '@/components/contextMenu';
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
  flexCol,
  timeGridBoundary,
  midnightLabel,
  cn,
} from '@/styles/classNames';

interface DayContentProps {
  app: ICalendarApp;
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
  onDateChange?: (date: Date) => void;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  calendarRef: any;
  allDayRowRef: any;
  switcherMode: string;
  isMobile: boolean;
  isTouch: boolean;
  setDraftEvent: (event: Event | null) => void;
  setIsDrawerOpen: (isOpen: boolean) => void;
  ALL_DAY_HEIGHT: number;
  HOUR_HEIGHT: number;
  FIRST_HOUR: number;
  LAST_HOUR: number;
  showAllDay: boolean;
  showStartOfDayLabel: boolean;
  timeFormat?: '12h' | '24h';
}

export const DayContent = ({
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
  onDateChange,
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
  showAllDay,
  showStartOfDayLabel,
  timeFormat = '24h',
}: DayContentProps) => {
  const { t, locale } = useLocale();
  const prevHighlightedEventId = useRef(app.state.highlightedEventId);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    date: Date;
  } | null>(null);
  const hasScrollbarSpace = scrollbarTakesSpace();

  // Measure offset from .calendar-content top to the first time grid row,
  // accounting for boundary elements above the grid
  const getGridOffset = () => {
    const content = calendarRef.current?.querySelector('.calendar-content');
    if (!content) return 0;
    const firstRow = content.querySelector('.df-time-grid-row');
    if (!firstRow) return 0;
    return (
      firstRow.getBoundingClientRect().top -
      content.getBoundingClientRect().top +
      content.scrollTop
    );
  };

  const handleContextMenu = (e: any, isAllDay: boolean) => {
    e.preventDefault();
    if (isMobile) return;

    const date = new Date(currentDate);

    if (!isAllDay) {
      const rect = calendarRef.current
        ?.querySelector('.calendar-content')
        ?.getBoundingClientRect();
      if (rect) {
        const scrollTop =
          (
            calendarRef.current?.querySelector(
              '.calendar-content'
            ) as HTMLElement
          )?.scrollTop || 0;
        const gridOffset = getGridOffset();
        const relativeY = e.clientY - rect.top + scrollTop - gridOffset;
        const floatHour = relativeY / HOUR_HEIGHT + FIRST_HOUR;
        const h = Math.floor(floatHour);
        const m = Math.floor((floatHour - h) * 60);

        const snappedMinutes = Math.round(m / 15) * 15;
        const finalHour = snappedMinutes === 60 ? h + 1 : h;
        const finalMinutes = snappedMinutes === 60 ? 0 : snappedMinutes;

        date.setHours(finalHour, finalMinutes, 0, 0);
      }
    } else {
      date.setHours(0, 0, 0, 0);
    }

    setContextMenu({ x: e.clientX, y: e.clientY, date });
  };

  return (
    <div
      className={`flex-none ${switcherMode === 'buttons' ? '' : 'md:w-[60%]'} w-full md:w-[70%] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700`}
      onContextMenu={e => e.preventDefault()}
    >
      <div className={`relative ${flexCol} h-full`}>
        {/* Fixed navigation bar */}
        <div
          onContextMenu={e => e.preventDefault()}
          style={{
            paddingRight: isMobile || !hasScrollbarSpace ? '0px' : '15px',
          }}
        >
          <ViewHeader
            calendar={app}
            viewType={ViewType.DAY}
            currentDate={currentDate}
            customSubtitle={currentDate.toLocaleDateString(locale, {
              weekday: 'long',
            })}
          />
        </div>
        {/* All-day event area */}
        {showAllDay ? (
          <div
            className={cn(
              allDayRow,
              'border-t border-gray-200 dark:border-gray-700 items-stretch'
            )}
            ref={allDayRowRef}
            style={{
              paddingRight:
                isMobile || !hasScrollbarSpace ? '0px' : '0.6875rem',
            }}
            onContextMenu={e => handleContextMenu(e, true)}
          >
            <div
              className={`${allDayLabel} w-12 text-[10px] md:w-20 md:text-xs flex items-center`}
              onContextMenu={e => e.preventDefault()}
            >
              {t('allDay')}
            </div>
            <div
              className={cn(
                'flex flex-1 relative self-stretch',
                !isMobile && hasScrollbarSpace
                  ? 'border-r border-gray-200 dark:border-gray-700'
                  : ''
              )}
            >
              <div
                className="w-full relative"
                style={{ minHeight: `${allDayAreaHeight}px` }}
                onClick={() => onDateChange?.(currentDate)}
                onMouseDown={e => {
                  const currentDayIndex = Math.floor(
                    (currentDate.getTime() - currentWeekStart.getTime()) /
                      (24 * 60 * 60 * 1000)
                  );
                  handleCreateAllDayEvent?.(e, currentDayIndex);
                }}
                onDblClick={e => {
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
                    viewType={ViewType.DAY}
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
                      const isViewable =
                        app.getReadOnlyConfig().viewable !== false;
                      const isReadOnly = app.state.readOnly;
                      const evt = events.find(e => e.id === eventId);
                      if (
                        (isMobile || isTouch) &&
                        evt &&
                        isViewable &&
                        !isReadOnly
                      ) {
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
        ) : (
          <div
            className={cn(
              'border-b border-gray-200 dark:border-gray-700',
              !isMobile && hasScrollbarSpace ? 'pr-2.75' : ''
            )}
          />
        )}

        {/* Time grid and event area */}
        <div
          className={`${calendarContent} df-day-time-grid`}
          style={{ position: 'relative', scrollbarGutter: 'stable' }}
        >
          <div className="relative flex">
            {/* Current time line */}
            {isToday &&
              currentTime &&
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
                      marginTop: '0.75rem',
                    }}
                  >
                    <div className="flex items-center w-12 md:w-20">
                      <div className="relative w-full flex items-center"></div>
                      <div className={currentTimeLabel}>
                        {formatTime(hours, 0, timeFormat)}
                      </div>
                    </div>

                    <div className="flex-1 flex items-center">
                      <div className={currentTimeLineBar} />
                    </div>
                  </div>
                );
              })()}

            {/* Time column */}
            <div
              className={`${timeColumn} w-12 md:w-20`}
              onContextMenu={e => e.preventDefault()}
            >
              {/* Top boundary spacer */}
              <div className="h-3" />
              {timeSlots.map((slot, slotIndex) => (
                <div key={slotIndex} className={timeSlot}>
                  <div className={`${timeLabel} text-[10px] md:text-[12px]`}>
                    {showStartOfDayLabel && slotIndex === 0 ? '' : slot.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="grow select-none">
              {/* Top boundary */}
              <div
                className={cn(
                  timeGridBoundary,
                  !isMobile && hasScrollbarSpace ? 'border-r' : '',
                  'border-t-0'
                )}
              >
                <div
                  className={`${midnightLabel} -left-9.5`}
                  style={{ top: 'auto', bottom: '-0.625rem' }}
                >
                  {showStartOfDayLabel
                    ? formatTime(FIRST_HOUR, 0, timeFormat)
                    : ''}
                </div>
              </div>
              <div className="relative" style={{ WebkitTouchCallout: 'none' }}>
                {timeSlots.map((_slot, slotIndex) => (
                  <div
                    key={slotIndex}
                    className={cn(
                      timeGridRow,
                      !isMobile && hasScrollbarSpace ? 'border-r' : ''
                    )}
                    onClick={() => onDateChange?.(currentDate)}
                    onDblClick={e => {
                      const currentDayIndex = Math.floor(
                        (currentDate.getTime() - currentWeekStart.getTime()) /
                          (24 * 60 * 60 * 1000)
                      );
                      const rect = calendarRef.current
                        ?.querySelector('.calendar-content')
                        ?.getBoundingClientRect();
                      if (!rect) return;
                      const scrollTop =
                        (
                          calendarRef.current?.querySelector(
                            '.calendar-content'
                          ) as HTMLElement
                        )?.scrollTop || 0;
                      const gridOffset = getGridOffset();
                      const relativeY =
                        e.clientY - rect.top + scrollTop - gridOffset;
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
                      const scrollTop =
                        (
                          calendarRef.current?.querySelector(
                            '.calendar-content'
                          ) as HTMLElement
                        )?.scrollTop || 0;
                      const gridOffset = getGridOffset();
                      const relativeY =
                        e.clientY - rect.top + scrollTop - gridOffset;
                      const dropHour = Math.floor(
                        FIRST_HOUR + relativeY / HOUR_HEIGHT
                      );
                      handleDrop(e, currentDate, dropHour);
                    }}
                    onContextMenu={e => handleContextMenu(e, false)}
                  />
                ))}

                {/* Bottom boundary */}
                <div
                  className={cn(
                    timeGridBoundary,
                    !isMobile && hasScrollbarSpace ? 'border-r' : ''
                  )}
                >
                  <div className={`${midnightLabel} -left-9.5`}>
                    {formatTime(0, 0, timeFormat)}
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
                          viewType={ViewType.DAY}
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
                            const isViewable =
                              app.getReadOnlyConfig().viewable !== false;
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
      {contextMenu && (
        <GridContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          date={contextMenu.date}
          viewType={ViewType.DAY}
          onClose={() => setContextMenu(null)}
          app={app}
          onCreateEvent={() => {
            if (handleCreateStart) {
              const currentDayIndex = Math.floor(
                (currentDate.getTime() - currentWeekStart.getTime()) /
                  (24 * 60 * 60 * 1000)
              );
              const isAllDay =
                contextMenu.date.getHours() === 0 &&
                contextMenu.date.getMinutes() === 0;

              if (isAllDay) {
                handleCreateAllDayEvent?.(
                  { clientX: contextMenu.x, clientY: contextMenu.y } as any,
                  currentDayIndex
                );
              } else {
                const preciseHour =
                  contextMenu.date.getHours() +
                  contextMenu.date.getMinutes() / 60;
                const syntheticEvent = {
                  preventDefault: () => {},
                  stopPropagation: () => {},
                  clientX: contextMenu.x,
                  clientY: contextMenu.y,
                } as unknown as any;
                handleCreateStart(syntheticEvent, currentDayIndex, preciseHour);
              }
            }
          }}
        />
      )}
    </div>
  );
};
