import { useCallback } from 'preact/hooks';

import { ICalendarApp } from '@/types';
import { logger } from '@/utils/logger';

export type EventGesture = 'click' | 'dblclick';

export type EventActivateHandler = (
  eventId: string,
  /** Detail panel key of the clicked element, `${event.id}::...` for one
   * segment of an event shown in several places. */
  panelKey: string,
  e: MouseEvent,
  gesture: EventGesture
) => void;

/**
 * Clicks on events in views that do not use CalendarEvent (year, agenda),
 * following the same rules as the other views: `eventDetailTrigger` decides
 * whether a click or a double click opens the detail panel,
 * `callbacks.onEventClick` / `onEventDoubleClick` are called (the latter may
 * return false to keep the panel closed), and events that are not viewable,
 * or a calendar without detail editors, only select. Touch layouts have no
 * double click, so a tap opens the mobile editor there.
 */
export function useEventActivation(
  app: ICalendarApp,
  isMobile: boolean,
  setSelectedEventId: (id: string | null) => void,
  setDetailPanelEventId: (id: string | null) => void
): EventActivateHandler {
  return useCallback<EventActivateHandler>(
    (eventId, panelKey, e, gesture) => {
      const event = app.getEvents().find(item => item.id === eventId);
      if (!event) return;
      const opensOnClick = isMobile || app.getEventDetailTrigger() === 'click';
      const canOpen =
        app.getReadOnlyConfig(eventId).viewable !== false &&
        (isMobile || app.getEventDetailEnabled());
      const open = () => setDetailPanelEventId(panelKey);

      if (gesture === 'click') {
        setSelectedEventId(eventId);
        app.onEventClick(event, e);
        if (opensOnClick && canOpen) open();
        else if (!opensOnClick) setDetailPanelEventId(null);
        return;
      }

      if (opensOnClick || !canOpen) return;
      Promise.resolve(app.onEventDoubleClick(event, e))
        .then(result => {
          if (result !== false) open();
        })
        .catch(error => {
          logger.error('Failed to handle event double click callback', error);
          open();
        });
    },
    [app, isMobile, setSelectedEventId, setDetailPanelEventId]
  );
}
