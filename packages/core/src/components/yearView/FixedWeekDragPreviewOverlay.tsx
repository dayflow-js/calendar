import { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';

import { getEventIcon } from '@/components/monthView/util';
import { Event, ICalendarApp } from '@/types';
import {
  getLineColor,
  getPrimaryCalendarId,
  getSelectedBgColor,
} from '@/utils';

import {
  createPreviewMonthSegment,
  eventOverlapsMonth,
  FixedWeekMonthData,
} from './utils';

interface FixedWeekDragPreviewOverlayProps {
  dragPreviewEvent: Event | null;
  monthsData: FixedWeekMonthData[];
  currentYear: number;
  startOfWeek: number;
  totalColumns: number;
  appTimeZone?: string;
  app: ICalendarApp;
}

const EVENT_LAYER_TOP = 20; // matches df-year-fixed-event-layer top: 20
const HORIZONTAL_MARGIN = 2;
const EVENT_HEIGHT = 16;
const ROW_SPACING = 18;

// Lightweight drag-preview overlay for fixed-week year view.
export const FixedWeekDragPreviewOverlay = ({
  dragPreviewEvent,
  monthsData,
  currentYear,
  startOfWeek,
  totalColumns,
  appTimeZone,
  app,
}: FixedWeekDragPreviewOverlayProps) => {
  const monthOffsets = useMemo(() => {
    const offsets: number[] = [];
    let cumulative = 0;
    for (let i = 0; i < monthsData.length; i++) {
      offsets.push(cumulative);
      cumulative += monthsData[i].minHeight;
    }
    return offsets;
  }, [monthsData]);

  const pills = useMemo(() => {
    if (!dragPreviewEvent) return [];
    const calendarId = getPrimaryCalendarId(dragPreviewEvent);
    const registry = app.getCalendarRegistry();
    // Drag preview uses the selected bg color so the cell-snap target reads
    // as the active "this is where it will land" pill, matching Apple
    const bgColor = getSelectedBgColor(calendarId, registry);
    const textColor = '#fff';
    const lineColor = getLineColor(calendarId, registry);
    const isAllDay = !!dragPreviewEvent.allDay;
    // getEventIcon's resolved JSX is shared across all preview segments so we
    // compute it once outside the per-month loop.
    const icon: ComponentChildren = isAllDay
      ? getEventIcon(dragPreviewEvent)
      : null;

    const result: Array<{
      id: string;
      top: number;
      leftPercent: number;
      widthPercent: number;
      bgColor: string;
      textColor: string;
      title: string;
      isFirstSegment: boolean;
      isLastSegment: boolean;
      isAllDay: boolean;
      icon: ComponentChildren;
      lineColor: string;
    }> = [];

    for (let i = 0; i < monthsData.length; i++) {
      const month = monthsData[i];
      if (
        !eventOverlapsMonth(
          dragPreviewEvent,
          currentYear,
          month.monthIndex,
          appTimeZone
        )
      ) {
        continue;
      }
      const segment = createPreviewMonthSegment(
        dragPreviewEvent,
        month.monthIndex,
        currentYear,
        startOfWeek,
        appTimeZone
      );
      if (!segment) continue;

      const startPercent = (segment.startCellIndex / totalColumns) * 100;
      const widthPercent =
        ((segment.endCellIndex - segment.startCellIndex + 1) / totalColumns) *
        100;
      const top =
        monthOffsets[i] +
        EVENT_LAYER_TOP +
        segment.visualRowIndex * ROW_SPACING;

      result.push({
        id: segment.id,
        top,
        leftPercent: startPercent,
        widthPercent,
        bgColor,
        textColor,
        title: dragPreviewEvent.title || '',
        isFirstSegment: segment.isFirstSegment,
        isLastSegment: segment.isLastSegment,
        isAllDay,
        icon,
        lineColor,
      });
    }
    return result;
  }, [
    dragPreviewEvent,
    monthsData,
    monthOffsets,
    currentYear,
    startOfWeek,
    totalColumns,
    appTimeZone,
    app,
  ]);

  if (pills.length === 0) return null;

  return (
    <div
      className='df-year-fixed-drag-overlay'
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 30,
      }}
    >
      {pills.map(pill => {
        const radius = '4px';
        const borderTopLeftRadius = pill.isFirstSegment ? radius : '0';
        const borderBottomLeftRadius = pill.isFirstSegment ? radius : '0';
        const borderTopRightRadius = pill.isLastSegment ? radius : '0';
        const borderBottomRightRadius = pill.isLastSegment ? radius : '0';
        const showIcon = pill.isAllDay && pill.isFirstSegment && !!pill.icon;
        return (
          <div
            key={pill.id}
            style={{
              position: 'absolute',
              left: `calc(${pill.leftPercent}% + ${HORIZONTAL_MARGIN}px)`,
              top: `${pill.top}px`,
              width: `calc(${pill.widthPercent}% - ${HORIZONTAL_MARGIN * 2}px)`,
              height: `${EVENT_HEIGHT}px`,
              backgroundColor: pill.bgColor,
              color: pill.textColor,
              borderTopLeftRadius,
              borderBottomLeftRadius,
              borderTopRightRadius,
              borderBottomRightRadius,
              fontSize: '11px',
              lineHeight: `${EVENT_HEIGHT}px`,
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12)',
              pointerEvents: 'none',
            }}
          >
            {showIcon && (
              <div
                className='df-event-year-icon-badge'
                style={{
                  flexShrink: 0,
                  backgroundColor: pill.lineColor,
                  marginRight: '4px',
                }}
              >
                {pill.icon}
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
              {pill.isFirstSegment ? pill.title : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
};

(FixedWeekDragPreviewOverlay as { displayName?: string }).displayName =
  'FixedWeekDragPreviewOverlay';
