import { h, Fragment } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { memo } from 'preact/compat';
import {
  Event,
  ViewType,
  MonthEventDragState,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ICalendarApp,
} from '@/types';
import { YearDayCell } from './YearDayCell';
import { YearMultiDayEvent } from './YearMultiDayEvent';
import { analyzeMultiDayEventsForRow } from './utils';
import { GridContextMenu } from '@/components/contextMenu';

interface YearRowComponentProps {
  rowDays: Date[];
  events: Event[];
  columnsPerRow: number;
  app: ICalendarApp;
  calendarRef: any;
  locale: string;
  isDragging: boolean;
  dragState: MonthEventDragState;
  onMoveStart?: (e: any | any, event: Event) => void;
  onResizeStart?: (e: any | any, event: Event, direction: string) => void;
  onCreateStart?: (e: any | any, targetDate: Date) => void;
  selectedEventId: string | null;
  onEventSelect: (eventId: string | null) => void;
  onMoreEventsClick?: (date: Date) => void;
  newlyCreatedEventId?: string | null;
  onDetailPanelOpen?: () => void;
  detailPanelEventId: string | null;
  onDetailPanelToggle: (eventId: string | null) => void;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
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
  }: YearRowComponentProps) => {
    const MAX_VISIBLE_ROWS = 3;
    const HEADER_HEIGHT = 26;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
      date: Date;
    } | null>(null);

    const handleContextMenu = (e: any, date: Date) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, date });
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
                <YearMultiDayEvent
                  segment={segment}
                  columnsPerRow={columnsPerRow}
                  isDragging={
                    isDragging && dragState.eventId === segment.event.id
                  }
                  isSelected={selectedEventId === segment.event.id}
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
                />
              </div>
            ))}
          </div>
        </div>
        {contextMenu && (
          <GridContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            date={contextMenu.date}
            viewType={ViewType.YEAR}
            onClose={() => setContextMenu(null)}
            app={app}
            onCreateEvent={() => {
              if (onCreateStart) {
                const syntheticEvent = {
                  preventDefault: () => {},
                  stopPropagation: () => {},
                  clientX: contextMenu.x,
                  clientY: contextMenu.y,
                } as unknown as any;
                onCreateStart(syntheticEvent, contextMenu.date);
              }
            }}
          />
        )}
      </div>
    );
  }
);

(YearRowComponent as any).displayName = 'YearRowComponent';
