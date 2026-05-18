import { memo } from 'preact/compat';
import { useCallback, useMemo } from 'preact/hooks';

import { getEventIcon } from '@/components/monthView/util';
import { Event, MonthEventDragState, ICalendarApp } from '@/types';
import {
  getLineColor,
  getPrimaryCalendarId,
  getSelectedBgColor,
  getTodayInTimeZone,
} from '@/utils';

import {
  analyzeMultiDayEventsForRow,
  getEventDayRange,
  YearMultiDaySegment,
} from './utils';
import { YearDayCell } from './YearDayCell';
import { YearEventBar } from './YearEventBar';

const PILL_HORIZONTAL_MARGIN = 2;
const PILL_EVENT_HEIGHT = 16;
const PILL_ROW_SPACING = 18;

// Lightweight drag-preview pill for year-canvas mode. Same purpose as the
// fixed-week overlay: avoid a full CalendarEvent render per drag tick.
interface YearDragPreviewPillProps {
  segment: YearMultiDaySegment;
  event: Event;
  columnsPerRow: number;
  app: ICalendarApp;
}

const YearDragPreviewPill = ({
  segment,
  event,
  columnsPerRow,
  app,
}: YearDragPreviewPillProps) => {
  const calendarId = getPrimaryCalendarId(event);
  const registry = app.getCalendarRegistry();
  // Drag preview uses the selected bg color so the cell-snap target reads as
  // the active "this is where it will land" pill, matching Apple/Google.
  const bgColor = getSelectedBgColor(calendarId, registry);
  const textColor = '#fff';
  const isAllDay = !!event.allDay;
  const {
    startCellIndex,
    endCellIndex,
    visualRowIndex,
    isFirstSegment,
    isLastSegment,
  } = segment;
  const startPercent = (startCellIndex / columnsPerRow) * 100;
  const widthPercent =
    ((endCellIndex - startCellIndex + 1) / columnsPerRow) * 100;
  const radius = '4px';
  const icon = isAllDay && isFirstSegment ? getEventIcon(event) : null;
  return (
    <div
      style={{
        position: 'absolute',
        left: `calc(${startPercent}% + ${PILL_HORIZONTAL_MARGIN}px)`,
        top: `${visualRowIndex * PILL_ROW_SPACING}px`,
        width: `calc(${widthPercent}% - ${PILL_HORIZONTAL_MARGIN * 2}px)`,
        height: `${PILL_EVENT_HEIGHT}px`,
        backgroundColor: bgColor,
        color: textColor,
        borderTopLeftRadius: isFirstSegment ? radius : '0',
        borderBottomLeftRadius: isFirstSegment ? radius : '0',
        borderTopRightRadius: isLastSegment ? radius : '0',
        borderBottomRightRadius: isLastSegment ? radius : '0',
        fontSize: '11px',
        lineHeight: `${PILL_EVENT_HEIGHT}px`,
        padding: '0 4px',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12)',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      {icon && (
        <div
          className='df-event-year-icon-badge'
          style={{
            flexShrink: 0,
            backgroundColor: getLineColor(calendarId, registry),
            marginRight: '4px',
          }}
        >
          {icon}
        </div>
      )}
      <span
        className='df-event-year-title-fade'
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {isFirstSegment ? event.title : ''}
      </span>
    </div>
  );
};

interface YearStaticEventsLayerProps {
  segments: YearMultiDaySegment[];
  columnsPerRow: number;
  app: ICalendarApp;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string, segmentId: string) => void;
  onMoveStart?: (e: MouseEvent | TouchEvent, event: Event) => void;
  onContextMenuEvent?: (e: MouseEvent, event: Event) => void;
  isDraggable: boolean;
}

// Lightweight static layer: renders all non-dragged events as bare
// YearEventBars. Memoized — does not re-render during drag.
const YearStaticEventsLayer = memo(
  ({
    segments,
    columnsPerRow,
    app,
    selectedEventId,
    onSelectEvent,
    onMoveStart,
    onContextMenuEvent,
    isDraggable,
  }: YearStaticEventsLayerProps) => (
    <>
      {segments.map(segment => (
        <YearEventBar
          key={segment.id}
          event={segment.event}
          segment={segment}
          columnsPerRow={columnsPerRow}
          isSelected={selectedEventId === segment.event.id}
          isBeingDragged={false}
          isDraggable={isDraggable}
          app={app}
          onSelect={onSelectEvent}
          onMoveStart={onMoveStart}
          onContextMenu={onContextMenuEvent}
        />
      ))}
    </>
  )
);

(YearStaticEventsLayer as { displayName?: string }).displayName =
  'YearStaticEventsLayer';

interface YearRowComponentProps {
  rowDays: Date[];
  events: Event[];
  columnsPerRow: number;
  app: ICalendarApp;
  locale: string;
  isDragging: boolean;
  dragState: MonthEventDragState;
  onMoveStart?: (e: MouseEvent | TouchEvent, event: Event) => void;
  onSelectDate: (date: Date) => void;
  onCreateStart?: (e: MouseEvent | TouchEvent, targetDate: Date) => void;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string, segmentId: string) => void;
  onContextMenuEvent?: (e: MouseEvent, event: Event) => void;
  onMoreEventsClick?: (date: Date) => void;
  onContextMenu: (menu: { x: number; y: number; date: Date } | null) => void;
  appTimeZone?: string;
  dragPreviewEvent?: Event | null;
  isDraggable: boolean;
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

  const range = getEventDayRange(event, appTimeZone);
  return range.startMs <= rowEndMs && range.endMsEod >= rowStartMs;
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

  const range = getEventDayRange(event, appTimeZone);

  if (range.startMs > rowEndMs || range.endMs < rowStartMs) {
    return null;
  }

  let startCellIndex = Math.round(
    (Math.max(range.startMs, rowStartMs) - rowStartMs) / (1000 * 60 * 60 * 24)
  );
  let endCellIndex = Math.round(
    (Math.min(range.endMs, rowEndMs) - rowStartMs) / (1000 * 60 * 60 * 24)
  );

  startCellIndex = Math.max(0, Math.min(startCellIndex, columnsPerRow - 1));
  endCellIndex = Math.max(0, Math.min(endCellIndex, columnsPerRow - 1));

  return {
    id: `${event.id}::preview-year-${rowStartMs}`,
    event,
    startCellIndex,
    endCellIndex,
    isFirstSegment: range.startMs >= rowStartMs,
    isLastSegment: range.endMs <= rowEndMs,
    visualRowIndex: 0,
  };
};

export const YearRowComponent = memo(
  ({
    rowDays,
    events,
    columnsPerRow,
    app,
    locale,
    isDragging,
    dragState,
    onMoveStart,
    onSelectDate,
    onCreateStart,
    selectedEventId,
    onSelectEvent,
    onContextMenuEvent,
    onMoreEventsClick,
    onContextMenu,
    appTimeZone,
    dragPreviewEvent,
    isDraggable,
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
      const colCounts = Array.from({ length: rowDays.length }).fill(
        0
      ) as number[];
      effectiveSegments.forEach(segment => {
        const start = Math.max(0, segment.startCellIndex);
        const end = Math.min(rowDays.length - 1, segment.endCellIndex);
        for (let i = start; i <= end; i++) {
          colCounts[i]++;
        }
      });

      const visible: typeof effectiveSegments = [];
      const counts = Array.from({ length: rowDays.length }).fill(0) as number[];

      effectiveSegments.forEach(segment => {
        let isVisible = true;
        const start = Math.max(0, segment.startCellIndex);
        const end = Math.min(rowDays.length - 1, segment.endCellIndex);

        for (let i = start; i <= end; i++) {
          const count = colCounts[i];
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
          for (let i = start; i <= end; i++) {
            counts[i]++;
          }
        }
      });

      return { visibleSegments: visible, moreCounts: counts };
    }, [effectiveSegments, rowDays.length]);

    // Stable during drag: only flips when drag starts/ends. The static layer
    // keys off this so its events don't re-render on every drag cell crossing.
    const moveDraggedEventId = isMovePreviewActive ? dragState.eventId : null;

    const staticVisibleSegments = useMemo(() => {
      if (!moveDraggedEventId) return visibleSegments;
      return visibleSegments.filter(
        segment => segment.event.id !== moveDraggedEventId
      );
    }, [visibleSegments, moveDraggedEventId]);

    return (
      <div
        className='df-year-row'
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columnsPerRow}, 1fr)`,
        }}
        onContextMenu={e => e.preventDefault()}
      >
        {rowDays.map((date, index) => {
          const isToday = date.getTime() === today.getTime();
          return (
            <YearDayCell
              key={date.getTime()}
              date={date}
              isToday={isToday}
              locale={locale}
              onSelectDate={onSelectDate}
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
            <YearStaticEventsLayer
              segments={staticVisibleSegments}
              columnsPerRow={columnsPerRow}
              app={app}
              selectedEventId={selectedEventId}
              onSelectEvent={onSelectEvent}
              onMoveStart={onMoveStart}
              onContextMenuEvent={onContextMenuEvent}
              isDraggable={isDraggable}
            />
            {dragPreviewSegment && (
              <YearDragPreviewPill
                segment={dragPreviewSegment}
                event={dragPreviewSegment.event}
                columnsPerRow={columnsPerRow}
                app={app}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);

(YearRowComponent as { displayName?: string }).displayName = 'YearRowComponent';
