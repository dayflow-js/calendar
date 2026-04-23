import { RefObject } from 'preact';
import { useEffect, useRef, useState, useMemo } from 'preact/hooks';

import CalendarEventComponent from '@/components/calendarEvent';
import ViewHeader from '@/components/common/ViewHeader';
import { GridContextMenu } from '@/components/contextMenu';
import { useLocale } from '@/locale';
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
  timeGridBoundary,
  midnightLabel,
  cn,
} from '@/styles/classNames';
import {
  Event,
  EventLayout,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  WeekDayDragState,
  ViewType,
  ICalendarApp,
} from '@/types';
import { formatTime, scrollbarTakesSpace } from '@/utils';
import {
  startPendingCreate,
  finalizeCreateOnDblClick,
} from '@/views/utils/dragCreate';

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
  dragState: WeekDayDragState | null;
  isDragging: boolean;
  handleMoveStart: (e: MouseEvent | TouchEvent, event: Event) => void;
  handleResizeStart: (
    e: MouseEvent | TouchEvent,
    event: Event,
    direction: string
  ) => void;
  handleCreateStart: (
    e: MouseEvent | TouchEvent,
    dayIndex: number,
    hour: number
  ) => void;
  handleCreateAllDayEvent: (
    e: MouseEvent | TouchEvent,
    dayIndex: number
  ) => void;
  handleTouchStart: (e: TouchEvent, dayIndex: number) => void;
  handleTouchEnd: (e: TouchEvent) => void;
  handleTouchMove: (e: TouchEvent) => void;
  handleDragOver: (e: DragEvent) => void;
  handleDrop: (
    e: DragEvent,
    date: Date,
    hour?: number,
    allDay?: boolean
  ) => void;
  handleEventUpdate: (event: Event) => void;
  handleEventDelete: (id: string) => void;
  onDateChange?: (date: Date) => void;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  useEventDetailPanel?: boolean;
  calendarRef: RefObject<HTMLDivElement>;
  allDayRowRef: RefObject<HTMLDivElement>;
  timeGridRef: RefObject<HTMLDivElement>;
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
  secondaryTimeSlots?: string[];
  primaryTzLabel?: string;
  secondaryTzLabel?: string;
  appTimeZone?: string;
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
  useEventDetailPanel,
  calendarRef,
  allDayRowRef,
  timeGridRef,
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
  secondaryTimeSlots,
  primaryTzLabel,
  secondaryTzLabel,
  appTimeZone,
}: DayContentProps) => {
  const hasSecondaryTz = !!secondaryTimeSlots && secondaryTimeSlots.length > 0;
  // On mobile the time column is too narrow for dual labels — hide secondary TZ display
  const showSecondaryTz = hasSecondaryTz && !isMobile;
  const { t } = useLocale();
  const prevHighlightedEventId = useRef(app.state.highlightedEventId);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    date: Date;
  } | null>(null);
  const hasScrollbarSpace = useMemo(() => scrollbarTakesSpace(), []);
  const headerSubtitleMeta = useMemo(() => {
    if (!showSecondaryTz || !secondaryTzLabel || !primaryTzLabel) {
      return null;
    }

    return (
      <>
        <span className='df-time-column-tz-label'>{secondaryTzLabel}</span>
        <span className='df-time-column-tz-label'>{primaryTzLabel}</span>
      </>
    );
  }, [showSecondaryTz, secondaryTzLabel, primaryTzLabel]);

  // Measure offset from .df-calendar-content top to the first time grid row,
  // accounting for boundary elements above the grid
  const getGridOffset = () => {
    const content = calendarRef.current?.querySelector('.df-calendar-content');
    if (!content) return 0;
    const firstRow = content.querySelector('.df-time-grid-row');
    if (!firstRow) return 0;
    return (
      firstRow.getBoundingClientRect().top -
      content.getBoundingClientRect().top +
      content.scrollTop
    );
  };

  /** Returns the fractional hour at the given clientY, or null if the ref is unavailable. */
  const getClickedHour = (clientY: number): number | null => {
    const content = calendarRef.current?.querySelector('.df-calendar-content');
    if (!content) return null;
    const rect = content.getBoundingClientRect();
    const scrollTop = (content as HTMLElement).scrollTop || 0;
    return (
      FIRST_HOUR +
      (clientY - rect.top + scrollTop - getGridOffset()) / HOUR_HEIGHT
    );
  };
  const isEditable = app.canMutateFromUI();

  useEffect(() => {
    if (isEditable) return;
    setContextMenu(null);
  }, [isEditable]);

  const handleContextMenu = (e: MouseEvent, isAllDay: boolean) => {
    e.preventDefault();
    if (isMobile || !isEditable) return;

    const date = new Date(currentDate);

    if (isAllDay) {
      date.setHours(0, 0, 0, 0);
    } else {
      const rect = calendarRef.current
        ?.querySelector('.df-calendar-content')
        ?.getBoundingClientRect();
      if (rect) {
        const scrollTop =
          (
            calendarRef.current?.querySelector(
              '.df-calendar-content'
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
    }

    setContextMenu({ x: e.clientX, y: e.clientY, date });
  };

  return (
    <div
      className='df-day-content'
      data-switcher-mode={switcherMode}
      onContextMenu={e => e.preventDefault()}
    >
      <div className='df-day-content-layout'>
        {/* Fixed navigation bar */}
        <div
          className='df-day-content-header-wrap'
          onContextMenu={e => e.preventDefault()}
          style={{
            paddingRight: isMobile || !hasScrollbarSpace ? '0px' : '15px',
          }}
        >
          <ViewHeader
            calendar={app}
            viewType={ViewType.DAY}
            currentDate={currentDate}
            subtitleMeta={headerSubtitleMeta}
          />
        </div>
        {/* All-day event area */}
        {showAllDay ? (
          <div
            className={cn(allDayRow, 'df-day-content-all-day-row')}
            ref={allDayRowRef}
            data-scrollbar-space={
              !isMobile && hasScrollbarSpace ? 'true' : 'false'
            }
            style={{
              paddingRight:
                isMobile || !hasScrollbarSpace ? '0px' : '0.6875rem',
            }}
            onContextMenu={e => handleContextMenu(e, true)}
          >
            <div
              className={cn(allDayLabel, 'df-day-content-all-day-label')}
              onContextMenu={e => e.preventDefault()}
            >
              {t('allDay')}
            </div>
            <div
              className='df-day-content-all-day-grid'
              data-scrollbar-space={
                !isMobile && hasScrollbarSpace ? 'true' : 'false'
              }
            >
              <div
                className='df-day-content-all-day-lane'
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
                      const isViewable = app.getReadOnlyConfig().viewable;
                      const canMutateFromUI = app.canMutateFromUI();
                      const evt = events.find(e => e.id === eventId);
                      if (
                        (isMobile || isTouch) &&
                        evt &&
                        isViewable &&
                        canMutateFromUI
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
                    useEventDetailPanel={useEventDetailPanel}
                    app={app}
                    isMobile={isMobile}
                    enableTouch={isTouch}
                    appTimeZone={appTimeZone}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className='df-day-content-all-day-spacer'
            data-scrollbar-space={
              !isMobile && hasScrollbarSpace ? 'true' : 'false'
            }
          />
        )}

        {/* Time grid and event area */}
        <div
          className={cn(calendarContent, 'df-day-content-grid')}
          style={{ scrollbarGutter: 'stable' }}
        >
          <div className='df-day-content-grid-inner'>
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
                    data-secondary-tz={showSecondaryTz ? 'true' : 'false'}
                    style={{
                      top: `${topPx}px`,
                      height: 0,
                      zIndex: 20,
                      marginTop: '0.75rem',
                    }}
                  >
                    <div className='df-day-content-current-time-side'>
                      <div className='df-day-content-current-time-side-inner' />
                      <div className={currentTimeLabel}>
                        {formatTime(hours, 0, timeFormat, false)}
                      </div>
                    </div>

                    <div className='df-day-content-current-time-rail'>
                      <div className={currentTimeLineBar} />
                    </div>
                  </div>
                );
              })()}

            {/* Time column */}
            <div
              className={timeColumn}
              data-secondary-tz={showSecondaryTz ? 'true' : 'false'}
              onContextMenu={e => e.preventDefault()}
            >
              {/* Top boundary spacer — expands to include timezone header when active */}
              <div
                className='df-time-column-spacer df-time-day-column-spacer'
                data-secondary-tz={showSecondaryTz ? 'true' : 'false'}
              />
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
                        {showStartOfDayLabel && slotIndex === 0
                          ? ''
                          : slot.label}
                      </span>
                    </div>
                  ) : (
                    <div className={timeLabel}>
                      {showStartOfDayLabel && slotIndex === 0 ? '' : slot.label}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className='df-day-content-grid-column'>
              {/* Top boundary — height must match time column spacer */}
              <div
                className={cn(
                  timeGridBoundary,
                  'df-time-grid-boundary-top',
                  'df-day-content-grid-boundary'
                )}
                data-scrollbar-space={
                  !isMobile && hasScrollbarSpace ? 'true' : 'false'
                }
              >
                <div
                  className={cn(midnightLabel, 'df-midnight-label-offset')}
                  style={{ top: 'auto', bottom: '-0.625rem' }}
                >
                  {showStartOfDayLabel
                    ? formatTime(FIRST_HOUR, 0, timeFormat)
                    : ''}
                </div>
              </div>
              <div
                className='df-day-content-grid-rows'
                style={{ WebkitTouchCallout: 'none' }}
                ref={timeGridRef}
                data-scrollbar-space={
                  !isMobile && hasScrollbarSpace ? 'true' : 'false'
                }
              >
                {timeSlots.map((_slot, slotIndex) => (
                  <div
                    key={slotIndex}
                    className={timeGridRow}
                    data-scrollbar-space={
                      !isMobile && hasScrollbarSpace ? 'true' : 'false'
                    }
                    onClick={() => onDateChange?.(currentDate)}
                    onMouseDown={e => {
                      const hour = getClickedHour(e.clientY);
                      if (hour === null) return;
                      const dayIndex = Math.floor(
                        (currentDate.getTime() - currentWeekStart.getTime()) /
                          (24 * 60 * 60 * 1000)
                      );
                      startPendingCreate(
                        e,
                        dayIndex,
                        hour,
                        isTouch,
                        handleCreateStart
                      );
                    }}
                    onDblClick={e => {
                      const hour = getClickedHour(e.clientY);
                      if (hour === null) return;
                      const dayIndex = Math.floor(
                        (currentDate.getTime() - currentWeekStart.getTime()) /
                          (24 * 60 * 60 * 1000)
                      );
                      handleCreateStart?.(e, dayIndex, hour);
                      finalizeCreateOnDblClick();
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
                        ?.querySelector('.df-calendar-content')
                        ?.getBoundingClientRect();
                      if (!rect) return;
                      const scrollTop =
                        (
                          calendarRef.current?.querySelector(
                            '.df-calendar-content'
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
                    'df-day-content-grid-boundary-bottom'
                  )}
                  data-scrollbar-space={
                    !isMobile && hasScrollbarSpace ? 'true' : 'false'
                  }
                >
                  {showSecondaryTz ? (
                    <div
                      className='df-time-column-tz-row df-day-content-bottom-tz-row'
                      style={{
                        left: isMobile ? '-5rem' : '-5.5rem',
                        width: isMobile ? '5rem' : '5.5rem',
                      }}
                    >
                      <span>{secondaryTimeSlots?.[0] ?? ''}</span>
                      <span>{formatTime(0, 0, timeFormat)}</span>
                    </div>
                  ) : (
                    <div
                      className={cn(midnightLabel, 'df-midnight-label-offset')}
                    >
                      {formatTime(0, 0, timeFormat)}
                    </div>
                  )}
                </div>

                {/* Event layer */}
                <div className='df-day-content-event-layer'>
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
                            const isViewable = app.getReadOnlyConfig().viewable;
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
                          appTimeZone={appTimeZone}
                        />
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isEditable && contextMenu && (
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
                  {
                    clientX: contextMenu.x,
                    clientY: contextMenu.y,
                  } as MouseEvent,
                  currentDayIndex
                );
              } else {
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
                } as MouseEvent;
                handleCreateStart(syntheticEvent, currentDayIndex, preciseHour);
              }
            }
          }}
        />
      )}
    </div>
  );
};
