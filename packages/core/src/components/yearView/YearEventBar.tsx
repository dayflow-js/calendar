import { memo } from 'preact/compat';

import { getEventIcon } from '@/components/monthView/util';
import { Event, ICalendarApp } from '@/types';
import {
  buildColorBarGradient,
  getCalendarLineColors,
  getEventBgColor,
  getEventTextColor,
  getLineColor,
  getPrimaryCalendarId,
  getSelectedBgColor,
} from '@/utils';

import { YearMultiDaySegment } from './utils';

interface YearEventBarProps {
  event: Event;
  segment: YearMultiDaySegment;
  columnsPerRow: number;
  isSelected: boolean;
  isBeingDragged: boolean;
  isDraggable: boolean;
  app: ICalendarApp;
  onSelect: (eventId: string, segmentId: string) => void;
  onMoveStart?: (e: MouseEvent | TouchEvent, event: Event) => void;
  onContextMenu?: (e: MouseEvent, event: Event) => void;
}

// Lightweight year-view event bar
export const YearEventBar = memo(
  ({
    event,
    segment,
    columnsPerRow,
    isSelected,
    isBeingDragged,
    isDraggable,
    app,
    onSelect,
    onMoveStart,
    onContextMenu,
  }: YearEventBarProps) => {
    const isAllDay = !!event.allDay;
    const calendarId = getPrimaryCalendarId(event);
    const registry = app.getCalendarRegistry();
    const bgColor = isSelected
      ? getSelectedBgColor(calendarId, registry)
      : getEventBgColor(calendarId, registry);
    const textColor = isSelected
      ? '#fff'
      : getEventTextColor(calendarId, registry);
    const lineColors = getCalendarLineColors(event, registry);
    const indicatorBackground = buildColorBarGradient(lineColors);
    const indicatorIsGradient = lineColors.length > 1;

    const {
      startCellIndex,
      endCellIndex,
      visualRowIndex,
      isFirstSegment,
      isLastSegment,
      id: segmentId,
    } = segment;
    const startPercent = (startCellIndex / columnsPerRow) * 100;
    const widthPercent =
      ((endCellIndex - startCellIndex + 1) / columnsPerRow) * 100;

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      onSelect(event.id, segmentId);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!isDraggable || !onMoveStart) return;
      onMoveStart(e, event);
    };

    const handleContextMenuEvent = (e: MouseEvent) => {
      if (!onContextMenu) return;
      onContextMenu(e, event);
    };

    const eventIcon = isAllDay && isFirstSegment ? getEventIcon(event) : null;
    const showTitle = isFirstSegment;
    const tailDot = isLastSegment && !isFirstSegment;

    return (
      <div
        data-event-id={event.id}
        data-segment-id={segmentId}
        data-selected={String(isSelected)}
        data-dragging={String(isBeingDragged)}
        className='df-year-event-bar'
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenuEvent}
        style={{
          position: 'absolute',
          left: `calc(${startPercent}% + 2px)`,
          top: `${visualRowIndex * 18}px`,
          width: `calc(${widthPercent}% - 4px)`,
          height: '16px',
          backgroundColor: bgColor,
          color: textColor,
          borderTopLeftRadius: isFirstSegment ? '4px' : '0',
          borderBottomLeftRadius: isFirstSegment ? '4px' : '0',
          borderTopRightRadius: isLastSegment ? '4px' : '0',
          borderBottomRightRadius: isLastSegment ? '4px' : '0',
          fontSize: '11px',
          lineHeight: '16px',
          padding: '0 4px',
          display: 'flex',
          alignItems: 'center',
          gap: isAllDay ? '0' : '4px',
          overflow: 'hidden',
          cursor: isDraggable ? 'pointer' : 'default',
          opacity: isBeingDragged ? 0.5 : 1,
          zIndex: isSelected ? 10 : 1,
          userSelect: 'none',
          // Parent .df-year-fixed-event-layer sets pointer-events: none so
          // the cell-background click-through works; bars opt back in here.
          pointerEvents: 'auto',
        }}
      >
        {isAllDay ? (
          eventIcon && (
            <div
              className='df-event-year-icon-badge'
              style={{
                flexShrink: 0,
                backgroundColor: getLineColor(calendarId, registry),
                marginRight: '4px',
              }}
            >
              {eventIcon}
            </div>
          )
        ) : (
          <span
            className='df-event-year-indicator'
            style={
              indicatorIsGradient
                ? { background: indicatorBackground }
                : { backgroundColor: indicatorBackground }
            }
          />
        )}
        <span
          className='df-event-year-title-fade'
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            fontWeight: isAllDay ? 400 : 500,
          }}
        >
          {showTitle ? event.title : tailDot ? '···' : ''}
        </span>
      </div>
    );
  }
);

(YearEventBar as { displayName?: string }).displayName = 'YearEventBar';
