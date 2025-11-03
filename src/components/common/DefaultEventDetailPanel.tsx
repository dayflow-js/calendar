import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Temporal } from 'temporal-polyfill';
import { EventDetailPanelProps } from '@/types/eventDetail';
import { isMultiDayEvent } from '@/utils/helpers';
import { isPlainDate } from '@/utils/temporal';
import { formatDate } from '@/utils/dateFormat';
import { getDefaultCalendarRegistry } from '@/core/calendarRegistry';
import ColorPicker, { ColorOption } from './ColorPicker';
import RangePicker from './RangePicker';

/**
 * Default event detail panel component
 */
const DefaultEventDetailPanel: React.FC<EventDetailPanelProps> = ({
  event,
  position,
  panelRef,
  isAllDay,
  eventVisibility,
  calendarRef,
  selectedEventElementRef,
  onEventUpdate,
  onEventDelete,
}) => {

  // Format date range
  const formatDateRange = () => {
    // For multi-day events, show date range
    if (isMultiDayEvent(event.start, event.end)) {
      return `${formatDate(event.start)} to ${formatDate(event.end)}`;
    }
    return formatDate(event.start);
  };

  // Get visible calendar type options
  const colorOptions: ColorOption[] = useMemo(() => {
    const registry = getDefaultCalendarRegistry();
    return registry.getVisible().map(cal => ({
      label: cal.name,
      value: cal.id,
    }));
  }, []);

  const convertToAllDay = () => {
    const plainDate = isPlainDate(event.start)
      ? event.start
      : event.start.toPlainDate();
    onEventUpdate({
      ...event,
      allDay: true,
      start: plainDate,
      end: plainDate,
    });
  };

  const convertToRegular = () => {
    const plainDate = isPlainDate(event.start)
      ? event.start
      : event.start.toPlainDate();
    const start = Temporal.ZonedDateTime.from({
      year: plainDate.year,
      month: plainDate.month,
      day: plainDate.day,
      hour: 9,
      minute: 0,
      timeZone: Temporal.Now.timeZoneId(),
    });
    const end = Temporal.ZonedDateTime.from({
      year: plainDate.year,
      month: plainDate.month,
      day: plainDate.day,
      hour: 10,
      minute: 0,
      timeZone: Temporal.Now.timeZoneId(),
    });
    onEventUpdate({
      ...event,
      allDay: false,
      start,
      end,
    });
  };

  // Calculate arrow style
  const calculateArrowStyle = (): React.CSSProperties => {
    let arrowStyle: React.CSSProperties = {};

    if (eventVisibility === 'sticky-top') {
      const calendarContent =
        calendarRef.current?.querySelector('.calendar-content');
      if (calendarContent) {
        const contentRect = calendarContent.getBoundingClientRect();
        const stickyEventCenterY = contentRect.top + 3;
        const arrowRelativeY = stickyEventCenterY - position.top;

        arrowStyle = {
          position: 'absolute',
          width: '12px',
          height: '12px',
          backgroundColor: 'white',
          transform: 'rotate(45deg)',
          transformOrigin: 'center',
          top: `${arrowRelativeY - 6}px`,
          borderRight: `${position.isSunday ? '1px solid rgb(229, 231, 235)' : 'none'}`,
          borderTop: `${position.isSunday ? '1px solid rgb(229, 231, 235)' : 'none'}`,
          borderLeft: `${position.isSunday ? 'none' : '1px solid rgb(229, 231, 235)'}`,
          borderBottom: `${position.isSunday ? 'none' : '1px solid rgb(229, 231, 235)'}`,
          ...(position.isSunday ? { right: '-6px' } : { left: '-6px' }),
        };
      }
    } else if (eventVisibility === 'sticky-bottom') {
      const panelElement = panelRef.current;
      let arrowTop = 200;

      if (panelElement) {
        const panelRect = panelElement.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(panelElement);
        const paddingBottom = parseInt(computedStyle.paddingBottom, 10) || 0;
        const borderBottom = parseInt(computedStyle.borderBottomWidth, 10) || 0;

        arrowTop = panelRect.height - paddingBottom - borderBottom - 6 + 11;
      }

      arrowStyle = {
        position: 'absolute',
        width: '12px',
        height: '12px',
        backgroundColor: 'white',
        transform: 'rotate(45deg)',
        transformOrigin: 'center',
        top: `${arrowTop}px`,
        left: position.isSunday ? undefined : '-6px',
        right: position.isSunday ? '-6px' : undefined,
        borderRight: `${position.isSunday ? '1px solid rgb(229, 231, 235)' : 'none'}`,
        borderTop: `${position.isSunday ? '1px solid rgb(229, 231, 235)' : 'none'}`,
        borderLeft: `${position.isSunday ? 'none' : '1px solid rgb(229, 231, 235)'}`,
        borderBottom: `${position.isSunday ? 'none' : '1px solid rgb(229, 231, 235)'}`,
      };
    } else {
      if (position && selectedEventElementRef.current && calendarRef.current) {
        const eventRect =
          selectedEventElementRef.current.getBoundingClientRect();
        const calendarContent =
          calendarRef.current.querySelector('.calendar-content');

        if (calendarContent) {
          const viewportRect = calendarContent.getBoundingClientRect();

          const visibleTop = Math.max(eventRect.top, viewportRect.top);
          const visibleBottom = Math.min(eventRect.bottom, viewportRect.bottom);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);

          let targetY;
          if (visibleHeight === eventRect.height) {
            targetY = eventRect.top + eventRect.height / 2;
          } else if (visibleHeight > 0) {
            targetY = visibleTop + visibleHeight / 2;
          } else {
            targetY = eventRect.top + eventRect.height / 2;
          }

          const arrowRelativeY = targetY - position.top;

          const panelElement = panelRef.current;
          let maxArrowY = 240 - 12;

          if (panelElement) {
            const panelRect = panelElement.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(panelElement);
            const paddingBottom =
              parseInt(computedStyle.paddingBottom, 10) || 0;
            const borderBottom =
              parseInt(computedStyle.borderBottomWidth, 10) || 0;

            maxArrowY = panelRect.height - paddingBottom - borderBottom + 11;
          }

          const minArrowY = 12;
          const finalArrowY = Math.max(
            minArrowY,
            Math.min(maxArrowY, arrowRelativeY)
          );

          arrowStyle = {
            position: 'absolute',
            width: '12px',
            height: '12px',
            backgroundColor: 'white',
            transform: 'rotate(45deg)',
            transformOrigin: 'center',
            top: `${finalArrowY - 6}px`,
            borderRight: `${position.isSunday ? '1px solid rgb(229, 231, 235)' : 'none'}`,
            borderTop: `${position.isSunday ? '1px solid rgb(229, 231, 235)' : 'none'}`,
            borderLeft: `${position.isSunday ? 'none' : '1px solid rgb(229, 231, 235)'}`,
            borderBottom: `${position.isSunday ? 'none' : '1px solid rgb(229, 231, 235)'}`,
            ...(position.isSunday ? { right: '-6px' } : { left: '-6px' }),
          };
        }
      }
    }

    return arrowStyle;
  };

  const arrowStyle = calculateArrowStyle();

  const panelContent = (
    <div
      ref={panelRef}
      className="fixed bg-white shadow-lg border border-gray-200 rounded-lg p-4 "
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999,
        pointerEvents: 'auto',
        backgroundColor: '#ffffff',
      }}
    >
      <div style={arrowStyle}></div>
      <span className="block text-xs text-gray-600 mb-1">Event Title</span>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex-1">
          <input
            type="text"
            value={event.title}
            onChange={e => {
              onEventUpdate({
                ...event,
                title: e.target.value,
              });
            }}
            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
          />
        </div>
        <ColorPicker
          options={colorOptions}
          value={event.calendarId || 'blue'}
          onChange={value => {
            onEventUpdate({
              ...event,
              calendarId: value,
            });
          }}
        />
      </div>

      {isAllDay ? (
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Date</div>
          <div className="text-xs text-gray-900 font-medium">
            {formatDateRange()}
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Time Range</div>
          <RangePicker
            value={[event.start, event.end]}
            timeZone={
              isPlainDate(event.start)
                ? Temporal.Now.timeZoneId()
                : (event.start as any).timeZoneId ??
                (event.start as Temporal.ZonedDateTime).timeZoneId
            }
            onChange={(nextRange) => {
              const [start, end] = nextRange;
              onEventUpdate({
                ...event,
                start,
                end,
              });
            }}
            onOk={(nextRange) => {
              const [start, end] = nextRange;
              onEventUpdate({
                ...event,
                start,
                end,
              });
            }}
          />
        </div>
      )}

      <div className="mb-3">
        <span className="block text-xs text-gray-600 mb-1">Note</span>
        <textarea
          value={event.description ?? ''}
          onChange={e =>
            onEventUpdate({
              ...event,
              description: e.target.value,
            })
          }
          rows={3}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition resize-none"
          placeholder="Add a note..."
        />
      </div>

      <div className="flex space-x-2">
        {!isAllDay ? (
          <button
            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-medium"
            onClick={convertToAllDay}
          >
            Set as All-day
          </button>
        ) : (
          <button
            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-medium"
            onClick={convertToRegular}
          >
            Set as Timed Event
          </button>
        )}

        <button
          className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-medium"
          onClick={() => onEventDelete(event.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const portalTarget = document.body;
  if (!portalTarget) return null;

  return ReactDOM.createPortal(panelContent, portalTarget);
};

export default DefaultEventDetailPanel;
