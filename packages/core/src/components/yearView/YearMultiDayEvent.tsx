import { useRef, useState, useEffect, useCallback } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import {
  Event,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  EventDetailPosition,
  ICalendarApp,
} from '@/types';
import {
  getEventBgColor,
  getEventTextColor,
  getSelectedBgColor,
  getLineColor,
} from '@/utils';
import { getEventIcon } from '@/components/monthView/util';
import { YearMultiDaySegment } from './utils';
import DefaultEventDetailPanel from '../common/DefaultEventDetailPanel';
import EventDetailPanelWithContent from '../common/EventDetailPanelWithContent';
import { EventContextMenu } from '@/components/contextMenu';

interface YearMultiDayEventProps {
  segment: YearMultiDaySegment;
  columnsPerRow: number;
  isDragging: boolean;
  isSelected: boolean;
  onMoveStart?: (e: any | any, event: Event) => void;
  onResizeStart?: (e: any | any, event: Event, direction: string) => void;
  onEventSelect?: (eventId: string | null) => void;
  detailPanelEventId?: string | null;
  onDetailPanelToggle?: (eventId: string | null) => void;
  newlyCreatedEventId?: string | null;
  onDetailPanelOpen?: () => void;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  app?: ICalendarApp;
  calendarRef?: any;
}

export const YearMultiDayEvent = ({
  segment,
  columnsPerRow,
  isDragging,
  isSelected,
  onMoveStart,
  onResizeStart,
  onEventSelect,
  detailPanelEventId,
  onDetailPanelToggle,
  newlyCreatedEventId,
  onDetailPanelOpen,
  customDetailPanelContent,
  customEventDetailDialog,
  app,
  calendarRef,
}: YearMultiDayEventProps) => {
  const {
    event,
    startCellIndex,
    endCellIndex,
    visualRowIndex,
    isFirstSegment,
    isLastSegment,
  } = segment;

  const eventRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const [detailPanelPosition, setDetailPanelPosition] =
    useState<EventDetailPosition | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Use segment.id to uniquely identify which segment's panel should be shown
  // This prevents multiple panels from showing for multi-month events
  const showDetailPanel = detailPanelEventId === segment.id;
  const isEditable = !app?.state.readOnly;

  const startPercent = (startCellIndex / columnsPerRow) * 100;
  const widthPercent =
    ((endCellIndex - startCellIndex + 1) / columnsPerRow) * 100;

  // Basic styling
  const calendarId = event.calendarId || 'blue';
  const bgColor = isSelected
    ? getSelectedBgColor(calendarId)
    : getEventBgColor(calendarId);
  const textColor = isSelected ? '#fff' : getEventTextColor(calendarId);
  const lineColor = getLineColor(calendarId);
  const isAllDay = !!event.allDay;
  const icon = isAllDay ? getEventIcon(event) : null;

  const EVENT_HEIGHT = 16;
  const ROW_SPACING = 18;
  const TOP_OFFSET = visualRowIndex * ROW_SPACING;
  const HORIZONTAL_MARGIN = 2; // Match MultiDayEvent

  const updatePanelPosition = useCallback(() => {
    if (!eventRef.current || !calendarRef?.current) return;

    const calendarRect = calendarRef.current.getBoundingClientRect();
    const rect = eventRef.current.getBoundingClientRect();

    const boundaryWidth = Math.min(window.innerWidth, calendarRect.right);
    const boundaryHeight = Math.min(window.innerHeight, calendarRect.bottom);

    requestAnimationFrame(() => {
      if (!detailPanelRef.current) {
        // Retry once if ref not ready
        requestAnimationFrame(() => {
          if (!detailPanelRef.current) return;
          const panelRect = detailPanelRef.current.getBoundingClientRect();
          const panelWidth = panelRect.width || 340;
          const panelHeight = panelRect.height || 240;

          let left: number, top: number;

          const spaceOnRight = boundaryWidth - rect.right;
          const spaceOnLeft = rect.left - calendarRect.left;

          if (spaceOnRight >= panelWidth + 20) {
            left = rect.right + 10;
          } else if (spaceOnLeft >= panelWidth + 20) {
            left = rect.left - panelWidth - 10;
          } else {
            if (spaceOnRight > spaceOnLeft) {
              left = Math.max(
                calendarRect.left + 10,
                boundaryWidth - panelWidth - 10
              );
            } else {
              left = calendarRect.left + 10;
            }
          }

          const idealTop = rect.top - panelHeight / 2 + rect.height / 2;
          const topBoundary = Math.max(10, calendarRect.top + 10);
          const bottomBoundary = boundaryHeight - 10;

          if (idealTop < topBoundary) {
            top = topBoundary;
          } else if (idealTop + panelHeight > bottomBoundary) {
            top = Math.max(topBoundary, bottomBoundary - panelHeight);
          } else {
            top = idealTop;
          }

          setDetailPanelPosition({
            top,
            left,
            eventHeight: rect.height,
            eventMiddleY: rect.top + rect.height / 2,
            isSunday: left < rect.left,
          });
        });
        return;
      }

      const panelRect = detailPanelRef.current.getBoundingClientRect();
      // Use fallback dimensions if measurement fails or returns 0 to prevent shrinking at screen edges
      const panelWidth = panelRect.width || 340;
      const panelHeight = panelRect.height || 240;

      let left: number, top: number;

      const spaceOnRight = boundaryWidth - rect.right;
      const spaceOnLeft = rect.left - calendarRect.left;

      if (spaceOnRight >= panelWidth + 20) {
        left = rect.right + 10;
      } else if (spaceOnLeft >= panelWidth + 20) {
        left = rect.left - panelWidth - 10;
      } else {
        if (spaceOnRight > spaceOnLeft) {
          left = Math.max(
            calendarRect.left + 10,
            boundaryWidth - panelWidth - 10
          );
        } else {
          left = calendarRect.left + 10;
        }
      }

      const idealTop = rect.top - panelHeight / 2 + rect.height / 2;
      const topBoundary = Math.max(10, calendarRect.top + 10);
      const bottomBoundary = boundaryHeight - 10;

      if (idealTop < topBoundary) {
        top = topBoundary;
      } else if (idealTop + panelHeight > bottomBoundary) {
        top = Math.max(topBoundary, bottomBoundary - panelHeight);
      } else {
        top = idealTop;
      }

      setDetailPanelPosition({
        top,
        left,
        eventHeight: rect.height,
        eventMiddleY: rect.top + rect.height / 2,
        isSunday: left < rect.left,
      });
    });
  }, [calendarRef, detailPanelPosition]);

  const showPanel = () => {
    onDetailPanelToggle?.(segment.id);
  };

  useEffect(() => {
    // Only auto-open panel for the first segment of newly created events
    if (
      newlyCreatedEventId === event.id &&
      !showDetailPanel &&
      isFirstSegment
    ) {
      // Delay slightly to ensure layout is ready
      setTimeout(() => {
        showPanel();
        onDetailPanelOpen?.();
      }, 50);
    }
  }, [
    newlyCreatedEventId,
    event.id,
    showDetailPanel,
    onDetailPanelOpen,
    isFirstSegment,
  ]);

  // Handle panel positioning when opened
  useEffect(() => {
    if (showDetailPanel && !detailPanelPosition) {
      setDetailPanelPosition({
        top: -9999,
        left: -9999,
        eventHeight: 0,
        eventMiddleY: 0,
        isSunday: false,
      });
      requestAnimationFrame(() => {
        updatePanelPosition();
      });
    }
  }, [showDetailPanel, detailPanelPosition, updatePanelPosition]);

  // Update position on scroll or resize
  useEffect(() => {
    if (!showDetailPanel) return;

    const handleUpdate = () => {
      updatePanelPosition();
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [showDetailPanel, updatePanelPosition]);

  const handleMouseDown = (e: any) => {
    e.stopPropagation();

    if (onMoveStart) {
      onMoveStart(e, event);
    }
  };

  const handleTouchStart = (e: any) => {
    e.stopPropagation();
    if (onEventSelect) {
      onEventSelect(event.id);
    }
    if (onMoveStart) {
      onMoveStart(e, event);
    }
  };

  const handleClick = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEventSelect) {
      onEventSelect(event.id);
    }
  };

  const handleDoubleClick = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    showPanel();
  };

  const handleContextMenu = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEventSelect) {
      onEventSelect(event.id);
    }
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const renderResizeHandle = (position: 'left' | 'right') => {
    const isLeft = position === 'left';
    const shouldShow = isLeft ? isFirstSegment : isLastSegment;

    // Only allow resizing for all-day events in Year View
    if (!event.allDay || !shouldShow || !onResizeStart || !isEditable)
      return null;

    return (
      <div
        className={`resize-handle absolute ${isLeft ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20`}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(e, event, isLeft ? 'left' : 'right');
        }}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    );
  };

  const renderDetailPanel = () => {
    if (!showDetailPanel || !calendarRef) return null;

    const handleClose = () => {
      onDetailPanelToggle?.(null);
      if (onEventSelect) onEventSelect(null);
    };

    if (customEventDetailDialog) {
      const DialogComponent = customEventDetailDialog;
      const dialogProps = {
        event,
        isOpen: showDetailPanel,
        isAllDay,
        onClose: handleClose,
        app: app!,
        onEventUpdate: (updated: Event) =>
          app?.updateEvent(updated.id, updated),
        onEventDelete: (id: string) => app?.deleteEvent(id),
      };

      if (typeof window === 'undefined' || typeof document === 'undefined')
        return null;
      const portalTarget = document.body;
      if (!portalTarget) return null;

      return createPortal(<DialogComponent {...dialogProps} />, portalTarget);
    }

    if (!detailPanelPosition) return null;

    if (customDetailPanelContent) {
      return (
        <EventDetailPanelWithContent
          event={event}
          position={detailPanelPosition}
          panelRef={detailPanelRef}
          isAllDay={isAllDay}
          onClose={handleClose}
          contentRenderer={customDetailPanelContent}
          onEventUpdate={updated => app?.updateEvent(updated.id, updated)}
          onEventDelete={id => app?.deleteEvent(id)}
          eventVisibility="visible"
          calendarRef={calendarRef}
          selectedEventElementRef={eventRef}
        />
      );
    }

    return (
      <DefaultEventDetailPanel
        event={event}
        position={detailPanelPosition}
        panelRef={detailPanelRef}
        isAllDay={isAllDay}
        onClose={handleClose}
        app={app}
        onEventUpdate={updated => app?.updateEvent(updated.id, updated)}
        onEventDelete={id => app?.deleteEvent(id)}
        eventVisibility="visible"
        calendarRef={calendarRef}
        selectedEventElementRef={eventRef}
      />
    );
  };

  // Calculate border radius based on segment position
  const getBorderRadius = () => {
    if (isFirstSegment && isLastSegment) return '0.25rem';
    if (isFirstSegment) return '0.25rem 0 0 0.25rem';
    if (isLastSegment) return '0 0.25rem 0.25rem 0';
    return '0';
  };

  const segmentDays = endCellIndex - startCellIndex + 1;

  const renderEventContent = () => {
    const isAllDayEvent = event.allDay;

    // Logic adapted from MultiDayEvent
    if (isAllDayEvent) {
      const getDisplayText = () => {
        if (segment.isFirstSegment) return event.title;
        return '···';
      };

      return (
        <div className="df-year-event-content flex items-center min-w-0 w-full pointer-events-auto h-full">
          {segment.isFirstSegment && getEventIcon(event) && (
            <div className="df-year-event-icon shrink-0 mr-1">
              <div
                className="rounded-full p-0.5 text-white flex items-center justify-center"
                style={{
                  backgroundColor: getLineColor(calendarId),
                  width: '12px',
                  height: '12px',
                }}
              >
                {getEventIcon(event)}
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div
              className="df-year-event-title text-[12px] leading-none whitespace-nowrap overflow-hidden"
              style={{
                maskImage:
                  'linear-gradient(to right, black 70%, transparent 100%)',
                WebkitMaskImage:
                  'linear-gradient(to right, black 70%, transparent 100%)',
              }}
            >
              {getDisplayText()}
            </div>
          </div>

          {/* Add small indicator for continuation if needed, similar to MultiDayEvent */}
          {segment.isLastSegment && !segment.isFirstSegment && (
            <div className="shrink-0 ml-1 text-white/80 dark:text-white/90">
              <div className="w-1.5 h-1.5 rounded-full bg-white/60 dark:bg-white/80"></div>
            </div>
          )}
        </div>
      );
    }

    // For non-all-day events treated as bars in Year View
    const titleText = segment.isFirstSegment ? event.title : '';

    return (
      <div className="df-year-event-content w-full h-full flex items-center overflow-hidden gap-1 pointer-events-auto">
        {!isAllDay && (
          <span
            style={{ backgroundColor: lineColor }}
            className="df-year-event-indicator inline-block w-0.75 h-3 shrink-0 rounded-full"
          ></span>
        )}
        {isAllDay && icon && (
          <div className="df-year-event-icon shrink-0 flex items-center justify-center opacity-80 scale-75">
            {icon}
          </div>
        )}
        <span
          className="df-year-event-title w-full block font-medium whitespace-nowrap overflow-hidden leading-none"
          style={{
            maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to right, black 70%, transparent 100%)',
          }}
        >
          {titleText}
        </span>
      </div>
    );
  };

  return (
    <>
      <div
        ref={eventRef}
        className="df-year-event absolute z-30 text-[12px] px-1 overflow-hidden whitespace-nowrap cursor-pointer transition-colors group"
        style={{
          left: `calc(${startPercent}% + ${HORIZONTAL_MARGIN}px)`,
          top: `${TOP_OFFSET}px`,
          height: `${EVENT_HEIGHT}px`,
          backgroundColor: bgColor,
          color: textColor,
          opacity: 1,
          width: `calc(${widthPercent}% - ${HORIZONTAL_MARGIN * 2}px)`,
          pointerEvents: isDragging ? 'none' : 'auto',
          borderRadius: getBorderRadius(),
        }}
        data-segment-days={segmentDays}
        data-event-id={event.id}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onDblClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onContextMenu={handleContextMenu}
        title={event.title}
      >
        {renderResizeHandle('left')}
        {renderEventContent()}
        {renderResizeHandle('right')}
      </div>
      {renderDetailPanel()}
      {contextMenuPosition && app && (
        <EventContextMenu
          event={event}
          x={contextMenuPosition.x}
          y={contextMenuPosition.y}
          onClose={() => setContextMenuPosition(null)}
          app={app}
          onDetailPanelToggle={onDetailPanelToggle}
          detailPanelKey={segment.id}
        />
      )}
    </>
  );
};
