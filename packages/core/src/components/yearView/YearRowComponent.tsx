import { RefObject } from 'preact';
import { memo } from 'preact/compat';
import { useCallback, useMemo } from 'preact/hooks';

import { CalendarEvent } from '@/components/calendarEvent';
import {
  Event,
  MonthEventDragState,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ICalendarApp,
  ViewType,
} from '@/types';
import { getTodayInTimeZone, temporalToVisualDate } from '@/utils';

import { analyzeMultiDayEventsForRow } from './utils';
import { YearDayCell } from './YearDayCell';

interface YearRowComponentProps {
  rowDays: Date[];
  events: Event[];
  columnsPerRow: number;
  app: ICalendarApp;
  calendarRef: RefObject<HTMLDivElement>;
  locale: string;
  isDragging: boolean;
  dragState: MonthEventDragState;
  onMoveStart?: (e: MouseEvent | TouchEvent, event: Event) => void;
  onResizeStart?: (
    e: MouseEvent | TouchEvent,
    event: Event,
    direction: string
  ) => void;
  onCreateStart?: (e: MouseEvent | TouchEvent, targetDate: Date) => void;
  selectedEventId: string | null;
  onEventSelect: (eventId: string | null) => void;
  onMoreEventsClick?: (date: Date) => void;
  newlyCreatedEventId?: string | null;
  onDetailPanelOpen?: () => void;
  detailPanelEventId: string | null;
  onDetailPanelToggle: (eventId: string | null) => void;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  onContextMenu: (menu: { x: number; y: number; date: Date } | null) => void;
  appTimeZone?: string;
  dragPreviewEvent?: Event | null;
}

const eventOverlapsRow = (
  event: Event | null | undefined,
  rowDays: Date[],
  appTimeZone?: string
) => {
  if (!event || rowDays.length === 0) return false;

  const firstDay = rowDays[0];
  const lastDay = rowDays.at(-1);
  if (!firstDay || !lastDay) return false;

  const rowStartMs = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth(),
    firstDay.getDate()
  ).getTime();
  const rowEndMs = new Date(
    lastDay.getFullYear(),
    lastDay.getMonth(),
    lastDay.getDate(),
    23,
    59,
    59,
    999
  ).getTime();

  const start = temporalToVisualDate(event.start, appTimeZone);
  const end = event.end ? temporalToVisualDate(event.end, appTimeZone) : start;
  const startMs = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  ).getTime();
  const endMs = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
    23,
    59,
    59,
    999
  ).getTime();

  return startMs <= rowEndMs && endMs >= rowStartMs;
};

const createPreviewRowSegment = (
  event: Event | null | undefined,
  rowDays: Date[],
  columnsPerRow: number,
  appTimeZone?: string
) => {
  if (!event || rowDays.length === 0) return null;

  const firstDay = rowDays[0];
  const lastDay = rowDays.at(-1);
  if (!firstDay || !lastDay) return null;

  const rowStartMs = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth(),
    firstDay.getDate()
  ).getTime();
  const rowEndMs = new Date(
    lastDay.getFullYear(),
    lastDay.getMonth(),
    lastDay.getDate(),
    23,
    59,
    59,
    999
  ).getTime();

  const start = temporalToVisualDate(event.start, appTimeZone);
  const end = event.end ? temporalToVisualDate(event.end, appTimeZone) : start;
  const startMs = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  ).getTime();
  const endMs = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  ).getTime();

  if (startMs > rowEndMs || endMs < rowStartMs) {
    return null;
  }

  let startCellIndex = Math.round(
    (Math.max(startMs, rowStartMs) - rowStartMs) / (1000 * 60 * 60 * 24)
  );
  let endCellIndex = Math.round(
    (Math.min(endMs, rowEndMs) - rowStartMs) / (1000 * 60 * 60 * 24)
  );

  startCellIndex = Math.max(0, Math.min(startCellIndex, columnsPerRow - 1));
  endCellIndex = Math.max(0, Math.min(endCellIndex, columnsPerRow - 1));

  return {
    id: `${event.id}::preview-year-${rowStartMs}`,
    event,
    startCellIndex,
    endCellIndex,
    isFirstSegment: startMs >= rowStartMs,
    isLastSegment: endMs <= rowEndMs,
    visualRowIndex: 0,
  };
};

export const YearRowComponent = memo(
  ({
    rowDays,
    events,
    columnsPerRow,
    app,
    calendarRef,
    locale,
    isDragging,
    dragState,
    onMoveStart,
    onResizeStart,
    onCreateStart,
    selectedEventId,
    onEventSelect,
    onMoreEventsClick,
    newlyCreatedEventId,
    onDetailPanelOpen,
    detailPanelEventId,
    onDetailPanelToggle,
    customDetailPanelContent,
    customEventDetailDialog,
    onContextMenu,
    appTimeZone,
    dragPreviewEvent,
  }: YearRowComponentProps) => {
    const MAX_VISIBLE_ROWS = 3;
    const HEADER_HEIGHT = 26;
    const today = useMemo(() => {
      const now = getTodayInTimeZone(appTimeZone);
      now.setHours(0, 0, 0, 0);
      return now;
    }, [appTimeZone]);

    const handleContextMenu = useCallback(
      (e: MouseEvent, date: Date) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu({ x: e.clientX, y: e.clientY, date });
      },
      [onContextMenu]
    );

    const handleSelectDate = useCallback(
      (d: Date) => {
        app.selectDate(d);
      },
      [app]
    );

    const segments = useMemo(
      () =>
        analyzeMultiDayEventsForRow(
          events,
          rowDays,
          columnsPerRow,
          app.state.allDaySortComparator,
          appTimeZone
        ),
      [
        events,
        rowDays,
        columnsPerRow,
        app.state.allDaySortComparator,
        appTimeZone,
      ]
    );

    const isMovePreviewActive =
      isDragging &&
      dragState.mode === 'move' &&
      !!dragPreviewEvent &&
      dragPreviewEvent.id === dragState.eventId;

    const effectiveSegments = useMemo(() => {
      if (!dragPreviewEvent) return segments;
      if (isMovePreviewActive) return segments;

      const adjustedEvents = events.filter(
        event => event.id !== dragPreviewEvent.id
      );
      if (eventOverlapsRow(dragPreviewEvent, rowDays, appTimeZone)) {
        adjustedEvents.push(dragPreviewEvent);
      }

      return analyzeMultiDayEventsForRow(
        adjustedEvents,
        rowDays,
        columnsPerRow,
        app.state.allDaySortComparator,
        appTimeZone
      );
    }, [
      dragPreviewEvent,
      isMovePreviewActive,
      segments,
      events,
      rowDays,
      columnsPerRow,
      app.state.allDaySortComparator,
      appTimeZone,
    ]);

    const dragPreviewSegment = useMemo(
      () =>
        isMovePreviewActive
          ? createPreviewRowSegment(
              dragPreviewEvent,
              rowDays,
              columnsPerRow,
              appTimeZone
            )
          : null,
      [
        isMovePreviewActive,
        dragPreviewEvent,
        rowDays,
        columnsPerRow,
        appTimeZone,
      ]
    );

    const { visibleSegments, moreCounts } = useMemo(() => {
      // 1. Calculate how many events are in each column
      const colCounts = Array.from({ length: rowDays.length }).fill(
        0
      ) as number[];
      effectiveSegments.forEach(segment => {
        // Be careful with boundaries
        const start = Math.max(0, segment.startCellIndex);
        const end = Math.min(rowDays.length - 1, segment.endCellIndex);

        for (let i = start; i <= end; i++) {
          colCounts[i]++;
        }
      });

      const visible: typeof effectiveSegments = [];
      const counts = Array.from({ length: rowDays.length }).fill(0) as number[];

      // 2. Determine visibility for each segment
      effectiveSegments.forEach(segment => {
        let isVisible = true;
        const start = Math.max(0, segment.startCellIndex);
        const end = Math.min(rowDays.length - 1, segment.endCellIndex);

        // Check each column this segment spans
        for (let i = start; i <= end; i++) {
          const count = colCounts[i];
          // If column has more than MAX, must reserve the last slot (MAX-1) for "More"
          // So valid indices are 0 to MAX-2.
          // If column has <= MAX, can use 0 to MAX-1.
          const maxAllowedIndex =
            count > MAX_VISIBLE_ROWS
              ? MAX_VISIBLE_ROWS - 2
              : MAX_VISIBLE_ROWS - 1;

          if (segment.visualRowIndex > maxAllowedIndex) {
            isVisible = false;
            break;
          }
        }

        if (isVisible) {
          visible.push(segment);
        } else {
          // Increment hidden count for covered days
          for (let i = start; i <= end; i++) {
            counts[i]++;
          }
        }
      });

      return { visibleSegments: visible, moreCounts: counts };
    }, [effectiveSegments, rowDays.length]);

    const renderedSegments = useMemo(() => {
      if (!isMovePreviewActive || !dragState.eventId) {
        return effectiveSegments;
      }

      const staticSegments = effectiveSegments.filter(
        segment => segment.event.id !== dragState.eventId
      );

      return dragPreviewSegment
        ? [...staticSegments, dragPreviewSegment]
        : staticSegments;
    }, [
      isMovePreviewActive,
      dragState.eventId,
      effectiveSegments,
      dragPreviewSegment,
    ]);

    return (
      <div
        className='df-year-row'
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columnsPerRow}, 1fr)`,
        }}
        onContextMenu={e => e.preventDefault()}
      >
        {/* Background Cells */}
        {rowDays.map((date, index) => {
          const isToday = date.getTime() === today.getTime();
          return (
            <YearDayCell
              key={date.getTime()}
              date={date}
              isToday={isToday}
              locale={locale}
              onSelectDate={handleSelectDate}
              onCreateStart={onCreateStart}
              onMoreEventsClick={onMoreEventsClick}
              moreCount={moreCounts[index]}
              onContextMenu={handleContextMenu}
            />
          );
        })}
        <div
          className='df-year-row-event-layer'
          style={{
            top: HEADER_HEIGHT,
            bottom: 0,
            left: 0,
            right: 0,
          }}
          onContextMenu={e => e.preventDefault()}
        >
          <div className='df-year-row-event-layer-inner'>
            {(isMovePreviewActive && dragState.eventId
              ? renderedSegments.filter(
                  segment =>
                    visibleSegments.some(
                      visibleSegment => visibleSegment.id === segment.id
                    ) || segment.id === dragPreviewSegment?.id
                )
              : visibleSegments
            ).map(segment => (
              <div key={segment.id} className='df-year-row-event-hitbox'>
                <CalendarEvent
                  event={segment.event}
                  isAllDay={!!segment.event.allDay}
                  viewType={ViewType.YEAR}
                  yearSegment={segment}
                  columnsPerRow={columnsPerRow}
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
                  customDetailPanelContent={customDetailPanelContent}
                  customEventDetailDialog={customEventDetailDialog}
                  // Required props for CalendarEvent
                  firstHour={0}
                  hourHeight={0}
                  onEventUpdate={updated =>
                    app.updateEvent(updated.id, updated)
                  }
                  onEventDelete={id => app.deleteEvent(id)}
                  appTimeZone={appTimeZone}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    const prevPreviewId = prevProps.dragPreviewEvent?.id;
    const nextPreviewId = nextProps.dragPreviewEvent?.id;
    const rowContainsDraggedEvent =
      (!!prevPreviewId &&
        prevProps.events.some(event => event.id === prevPreviewId)) ||
      (!!nextPreviewId &&
        nextProps.events.some(event => event.id === nextPreviewId));
    const prevOverlaps = eventOverlapsRow(
      prevProps.dragPreviewEvent,
      prevProps.rowDays,
      prevProps.appTimeZone
    );
    const nextOverlaps = eventOverlapsRow(
      nextProps.dragPreviewEvent,
      nextProps.rowDays,
      nextProps.appTimeZone
    );

    if (rowContainsDraggedEvent || prevOverlaps || nextOverlaps) {
      return false;
    }

    return (
      prevProps.rowDays === nextProps.rowDays &&
      prevProps.events === nextProps.events &&
      prevProps.columnsPerRow === nextProps.columnsPerRow &&
      prevProps.app === nextProps.app &&
      prevProps.calendarRef === nextProps.calendarRef &&
      prevProps.locale === nextProps.locale &&
      prevProps.onMoveStart === nextProps.onMoveStart &&
      prevProps.onResizeStart === nextProps.onResizeStart &&
      prevProps.onCreateStart === nextProps.onCreateStart &&
      prevProps.selectedEventId === nextProps.selectedEventId &&
      prevProps.onEventSelect === nextProps.onEventSelect &&
      prevProps.onMoreEventsClick === nextProps.onMoreEventsClick &&
      prevProps.newlyCreatedEventId === nextProps.newlyCreatedEventId &&
      prevProps.onDetailPanelOpen === nextProps.onDetailPanelOpen &&
      prevProps.detailPanelEventId === nextProps.detailPanelEventId &&
      prevProps.onDetailPanelToggle === nextProps.onDetailPanelToggle &&
      prevProps.customDetailPanelContent ===
        nextProps.customDetailPanelContent &&
      prevProps.customEventDetailDialog === nextProps.customEventDetailDialog &&
      prevProps.onContextMenu === nextProps.onContextMenu &&
      prevProps.appTimeZone === nextProps.appTimeZone
    );
  }
);

(YearRowComponent as { displayName?: string }).displayName = 'YearRowComponent';
