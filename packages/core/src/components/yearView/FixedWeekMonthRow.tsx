import { RefObject } from 'preact';
import { memo } from 'preact/compat';
import { useCallback, useMemo } from 'preact/hooks';

import { CalendarEvent } from '@/components/calendarEvent';
import {
  Event,
  MonthEventDragState,
  ViewType,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ICalendarApp,
} from '@/types';
import { getTodayInTimeZone } from '@/utils';

import {
  createPreviewMonthSegment,
  eventOverlapsMonth,
  FixedWeekMonthData,
} from './utils';

interface FixedWeekMonthRowProps {
  monthData: FixedWeekMonthData;
  currentYear: number;
  startOfWeek: number;
  totalColumns: number;
  app: ICalendarApp;
  calendarRef: RefObject<HTMLDivElement>;
  isDragging: boolean;
  dragState: MonthEventDragState;
  dragPreviewEvent?: Event | null;
  selectedEventId: string | null;
  onMoveStart?: (e: MouseEvent | TouchEvent, event: Event) => void;
  onResizeStart?: (
    e: MouseEvent | TouchEvent,
    event: Event,
    direction: string
  ) => void;
  onSelectDate: (date: Date) => void;
  onCreateStart?: (e: MouseEvent | TouchEvent, targetDate: Date) => void;
  onEventSelect: (eventId: string | null) => void;
  newlyCreatedEventId?: string | null;
  onDetailPanelOpen?: () => void;
  detailPanelEventId: string | null;
  onDetailPanelToggle: (eventId: string | null) => void;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  useEventDetailPanel?: boolean;
  onContextMenu: (e: MouseEvent, date: Date) => void;
  appTimeZone?: string;
}

export const FixedWeekMonthRow = memo(
  ({
    monthData,
    currentYear,
    startOfWeek,
    totalColumns,
    app,
    calendarRef,
    isDragging,
    dragState,
    dragPreviewEvent,
    selectedEventId,
    onMoveStart,
    onResizeStart,
    onSelectDate,
    onCreateStart,
    onEventSelect,
    newlyCreatedEventId,
    onDetailPanelOpen,
    detailPanelEventId,
    onDetailPanelToggle,
    customDetailPanelContent: _customDetailPanelContent,
    customEventDetailDialog: _customEventDetailDialog,
    useEventDetailPanel,
    onContextMenu,
    appTimeZone,
  }: FixedWeekMonthRowProps) => {
    const today = useMemo(() => {
      const now = getTodayInTimeZone(appTimeZone);
      now.setHours(0, 0, 0, 0);
      return now;
    }, [appTimeZone]);

    const handleEventUpdate = useCallback(
      (updated: Event) => app.updateEvent(updated.id, updated),
      [app]
    );

    const handleEventDelete = useCallback(
      (id: string) => app.deleteEvent(id),
      [app]
    );

    const isMovePreviewActive =
      isDragging &&
      dragState.mode === 'move' &&
      !!dragPreviewEvent &&
      dragPreviewEvent.id === dragState.eventId;

    const dragPreviewSegment = useMemo(
      () =>
        isMovePreviewActive
          ? createPreviewMonthSegment(
              dragPreviewEvent,
              monthData.monthIndex,
              currentYear,
              startOfWeek,
              appTimeZone
            )
          : null,
      [
        isMovePreviewActive,
        dragPreviewEvent,
        monthData.monthIndex,
        currentYear,
        startOfWeek,
        appTimeZone,
      ]
    );

    const renderedSegments = useMemo(() => {
      if (!isMovePreviewActive || !dragState.eventId) {
        return monthData.eventSegments;
      }

      const staticSegments = monthData.eventSegments.filter(
        segment => segment.event.id !== dragState.eventId
      );

      return dragPreviewSegment
        ? [...staticSegments, dragPreviewSegment]
        : staticSegments;
    }, [
      isMovePreviewActive,
      dragState.eventId,
      monthData.eventSegments,
      dragPreviewSegment,
    ]);

    return (
      <div
        className='df-year-fixed-month-row'
        style={{
          minHeight: `${monthData.minHeight}px`,
          transition: 'min-height 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className='df-year-fixed-background-grid'
          style={{
            gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))`,
          }}
        >
          {monthData.days.map((date, dayIndex) => {
            const dayOfWeek = (dayIndex + startOfWeek) % 7;
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            if (!date) {
              return (
                <div
                  key={`empty-${monthData.monthIndex}-${dayIndex}`}
                  className='df-year-fixed-empty-cell'
                  data-weekend={isWeekend ? 'true' : 'false'}
                />
              );
            }

            const isToday = date.getTime() === today.getTime();
            const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

            return (
              <div
                key={date.getTime()}
                data-date={dateString}
                className='df-year-fixed-day-cell'
                data-dragging={isDragging ? 'true' : 'false'}
                data-weekend={isWeekend ? 'true' : 'false'}
                onClick={() => onSelectDate(date)}
                onDblClick={e => onCreateStart?.(e, date)}
                onContextMenu={e => onContextMenu(e, date)}
              >
                <span
                  className='df-year-fixed-day-number'
                  data-today={isToday ? 'true' : 'false'}
                >
                  {date.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {renderedSegments.length > 0 && (
          <div className='df-year-fixed-event-layer' style={{ top: 20 }}>
            <div className='df-year-fixed-event-layer-inner'>
              {renderedSegments.map(segment => (
                <div key={segment.id} className='df-year-fixed-event-hitbox'>
                  <CalendarEvent
                    event={segment.event}
                    isAllDay={!!segment.event.allDay}
                    viewType={ViewType.YEAR}
                    yearSegment={segment}
                    columnsPerRow={totalColumns}
                    isBeingDragged={
                      isDragging && dragState.eventId === segment.event.id
                    }
                    selectedEventId={selectedEventId}
                    onMoveStart={onMoveStart}
                    onResizeStart={onResizeStart}
                    onEventSelect={onEventSelect}
                    onDetailPanelToggle={onDetailPanelToggle}
                    newlyCreatedEventId={newlyCreatedEventId}
                    onDetailPanelOpen={onDetailPanelOpen}
                    calendarRef={calendarRef}
                    app={app}
                    detailPanelEventId={detailPanelEventId}
                    useEventDetailPanel={useEventDetailPanel}
                    firstHour={0}
                    hourHeight={0}
                    onEventUpdate={handleEventUpdate}
                    onEventDelete={handleEventDelete}
                    appTimeZone={appTimeZone}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    const prevPreviewId = prevProps.dragPreviewEvent?.id;
    const nextPreviewId = nextProps.dragPreviewEvent?.id;
    const monthContainsDraggedEvent =
      (!!prevPreviewId &&
        prevProps.monthData.monthEvents.some(
          event => event.id === prevPreviewId
        )) ||
      (!!nextPreviewId &&
        nextProps.monthData.monthEvents.some(
          event => event.id === nextPreviewId
        ));
    const prevOverlaps = eventOverlapsMonth(
      prevProps.dragPreviewEvent,
      prevProps.currentYear,
      prevProps.monthData.monthIndex,
      prevProps.appTimeZone
    );
    const nextOverlaps = eventOverlapsMonth(
      nextProps.dragPreviewEvent,
      nextProps.currentYear,
      nextProps.monthData.monthIndex,
      nextProps.appTimeZone
    );

    if (monthContainsDraggedEvent || prevOverlaps || nextOverlaps) {
      return false;
    }

    return (
      prevProps.monthData === nextProps.monthData &&
      prevProps.currentYear === nextProps.currentYear &&
      prevProps.startOfWeek === nextProps.startOfWeek &&
      prevProps.totalColumns === nextProps.totalColumns &&
      prevProps.app === nextProps.app &&
      prevProps.calendarRef === nextProps.calendarRef &&
      prevProps.selectedEventId === nextProps.selectedEventId &&
      prevProps.onMoveStart === nextProps.onMoveStart &&
      prevProps.onResizeStart === nextProps.onResizeStart &&
      prevProps.onSelectDate === nextProps.onSelectDate &&
      prevProps.onCreateStart === nextProps.onCreateStart &&
      prevProps.onEventSelect === nextProps.onEventSelect &&
      prevProps.newlyCreatedEventId === nextProps.newlyCreatedEventId &&
      prevProps.onDetailPanelOpen === nextProps.onDetailPanelOpen &&
      prevProps.detailPanelEventId === nextProps.detailPanelEventId &&
      prevProps.onDetailPanelToggle === nextProps.onDetailPanelToggle &&
      prevProps.customDetailPanelContent ===
        nextProps.customDetailPanelContent &&
      prevProps.customEventDetailDialog === nextProps.customEventDetailDialog &&
      prevProps.useEventDetailPanel === nextProps.useEventDetailPanel &&
      prevProps.onContextMenu === nextProps.onContextMenu &&
      prevProps.appTimeZone === nextProps.appTimeZone
    );
  }
);

(FixedWeekMonthRow as { displayName?: string }).displayName =
  'FixedWeekMonthRow';
