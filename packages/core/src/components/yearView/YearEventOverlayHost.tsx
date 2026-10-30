import { RefObject } from 'preact';

import { EventDetailPanelHost } from '@/components/calendarEvent/components/EventDetailPanelHost';
import { EventContextMenu } from '@/components/contextMenu';
import { Event, ICalendarApp } from '@/types';

interface YearEventOverlayHostProps {
  app: ICalendarApp;
  events: Event[];
  selectedEventId: string | null;
  detailPanelEventId: string | null;
  onDetailPanelToggle: (id: string | null) => void;
  onEventSelect: (id: string | null) => void;
  eventContextMenu: { x: number; y: number; event: Event } | null;
  onCloseContextMenu: () => void;
  useEventDetailPanel?: boolean;
  isEditable: boolean;
  calendarRef: RefObject<HTMLDivElement>;
}

// Centralized host for year view's event detail panel + event context menu.
// The shared panel host anchors to the clicked bar (via its
// `data-detail-panel-key`) and keeps the panel inside the viewport.
export const YearEventOverlayHost = ({
  app,
  events,
  detailPanelEventId,
  onDetailPanelToggle,
  onEventSelect,
  eventContextMenu,
  onCloseContextMenu,
  useEventDetailPanel,
  isEditable,
  calendarRef,
}: YearEventOverlayHostProps) => (
  <>
    <EventDetailPanelHost
      app={app}
      events={events}
      calendarRef={calendarRef}
      detailPanelEventId={detailPanelEventId}
      useEventDetailPanel={useEventDetailPanel}
      onEventUpdate={updated => app.updateEvent(updated.id, updated)}
      onEventDelete={id => {
        app.deleteEvent(id);
        onDetailPanelToggle(null);
      }}
      onEventSelect={onEventSelect}
      onDetailPanelToggle={onDetailPanelToggle}
    />
    {isEditable && eventContextMenu && (
      <EventContextMenu
        event={eventContextMenu.event}
        x={eventContextMenu.x}
        y={eventContextMenu.y}
        onClose={onCloseContextMenu}
        app={app}
        onDetailPanelToggle={onDetailPanelToggle}
        detailPanelKey={eventContextMenu.event.id}
      />
    )}
  </>
);
