import React from 'react';
import ReactDOM from 'react-dom';
import {
  EventDetailPanelProps,
  EventDetailContentRenderer,
} from '@/types/eventDetail';

/**
 * Event detail panel wrapper for rendering custom content in the default panel
 */
interface EventDetailPanelWithContentProps extends EventDetailPanelProps {
  /** Custom content renderer */
  contentRenderer: EventDetailContentRenderer;
}

export const EventDetailPanelWithContent: React.FC<
  EventDetailPanelWithContentProps
> = ({
  event,
  position,
  panelRef,
  isAllDay,
  eventVisibility,
  calendarRef,
  selectedEventElementRef,
  onEventUpdate,
  onEventDelete,
  onClose,
  contentRenderer: ContentComponent,
}) => {
    // Calculate arrow style (same logic as DefaultEventDetailPanel)
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
        className="fixed bg-white shadow-lg border border-gray-200 rounded-lg p-3"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: 9999,
          pointerEvents: 'auto',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={arrowStyle}></div>
        <ContentComponent
          event={event}
          isAllDay={isAllDay}
          onEventUpdate={onEventUpdate}
          onEventDelete={onEventDelete}
          onClose={onClose}
        />
      </div>
    );

    return ReactDOM.createPortal(panelContent, document.body);
  };

export default EventDetailPanelWithContent;
