import { useMemo } from 'preact/hooks';
import { memo } from 'preact/compat';
import {
  Event,
  MonthEventDragState,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ICalendarApp,
  ViewType,
} from '@/types';
import { YearDayCell } from './YearDayCell';
import { CalendarEvent } from '../calendarEvent';
import { analyzeMultiDayEventsForRow } from './utils';

interface YearRowComponentProps {
  rowDays: Date[];
  events: Event[];
  columnsPerRow: number;
  app: ICalendarApp;
  calendarRef: any;
  locale: string;
  isDragging: boolean;
  dragState: MonthEventDragState;
  onMoveStart?: (e: any, event: Event) => void;
  onResizeStart?: (e: any, event: Event, direction: string) => void;
  onCreateStart?: (e: any, targetDate: Date) => void;
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
}

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
  }: YearRowComponentProps) => {
    const MAX_VISIBLE_ROWS = 3;
    const HEADER_HEIGHT = 26;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const handleContextMenu = (e: any, date: Date) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu({ x: e.clientX, y: e.clientY, date });
    };

    const segments = useMemo(() => {
      return analyzeMultiDayEventsForRow(events, rowDays, columnsPerRow);
    }, [events, rowDays, columnsPerRow]);

    const { visibleSegments, moreCounts } = useMemo(() => {
      // 1. Calculate how many events are in each column
      const colCounts = new Array(rowDays.length).fill(0);
      segments.forEach(segment => {
        // Be careful with boundaries
        const start = Math.max(0, segment.startCellIndex);
        const end = Math.min(rowDays.length - 1, segment.endCellIndex);

        for (let i = start; i <= end; i++) {
          colCounts[i]++;
        }
      });

      const visible: typeof segments = [];
      const counts = new Array(rowDays.length).fill(0);

      // 2. Determine visibility for each segment
      segments.forEach(segment => {
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
    }, [segments, rowDays.length]);

    return (
      <div
        className="relative w-full"
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
              onSelectDate={(d: any) => {
                app.selectDate(d);
              }}
              onCreateStart={onCreateStart}
              onMoreEventsClick={onMoreEventsClick}
              moreCount={moreCounts[index]}
              onContextMenu={handleContextMenu}
            />
          );
        })}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            top: HEADER_HEIGHT,
            bottom: 0,
            left: 0,
            right: 0,
          }}
          onContextMenu={e => e.preventDefault()}
        >
          <div className="relative w-full h-full">
            {visibleSegments.map(segment => (
              <div key={segment.id} className="pointer-events-auto">
                <CalendarEvent
                  event={segment.event}
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
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

(YearRowComponent as any).displayName = 'YearRowComponent';
