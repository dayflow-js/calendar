import { RefObject } from 'preact';
import { useContext, useLayoutEffect, useRef, useState } from 'preact/hooks';

import { EventDetailPanel } from '@/components/calendarEvent/components/EventDetailPanel';
import { EventContextMenu } from '@/components/contextMenu';
import { CustomRenderingContext } from '@/renderer/CustomRenderingContext';
import {
  Event,
  ICalendarApp,
  EventDetailPosition,
  EventDetailContentProps,
} from '@/types';

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

const contentSlotRenderer = (_props: EventDetailContentProps) => null;

// Centralized host for year view's event detail panel + event context menu.
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
}: YearEventOverlayHostProps) => {
  const customRenderingStore = useContext(CustomRenderingContext);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const selectedEventElementRef = useRef<HTMLElement | null>(null);
  const [detailPanelPosition, setDetailPanelPosition] =
    useState<EventDetailPosition | null>(null);

  const panelEnabled = useEventDetailPanel !== false;
  const showDetailPanel = panelEnabled && !!detailPanelEventId;

  // Compute panel position from the clicked bar's DOM rect.
  useLayoutEffect(() => {
    if (!showDetailPanel || !detailPanelEventId) {
      setDetailPanelPosition(null);
      selectedEventElementRef.current = null;
      return;
    }
    const eventId = detailPanelEventId.split('::')[0];
    const el =
      calendarRef.current?.querySelector<HTMLElement>(
        `[data-event-id="${eventId}"]`
      ) ?? null;
    if (!el) {
      setDetailPanelPosition(null);
      return;
    }
    selectedEventElementRef.current = el;
    const rect = el.getBoundingClientRect();
    setDetailPanelPosition({
      top: rect.top,
      left: rect.right + 8,
      eventHeight: rect.height,
      eventMiddleY: rect.top + rect.height / 2,
      isSunday: false,
    });
  }, [showDetailPanel, detailPanelEventId, calendarRef]);

  const selectedEvent =
    detailPanelEventId === null
      ? null
      : events.find(e => e.id === detailPanelEventId.split('::')[0]);

  const handlePanelClose = () => {
    onDetailPanelToggle(null);
    onEventSelect(null);
  };

  const handleEventUpdate = (updated: Event) =>
    app.updateEvent(updated.id, updated);
  const handleEventDelete = (id: string) => {
    app.deleteEvent(id);
    onDetailPanelToggle(null);
  };

  return (
    <>
      {selectedEvent && (
        <EventDetailPanel
          showDetailPanel={showDetailPanel}
          detailPanelPosition={detailPanelPosition}
          event={selectedEvent}
          detailPanelRef={detailPanelRef}
          isAllDay={!!selectedEvent.allDay}
          eventVisibility='standard'
          calendarRef={calendarRef}
          selectedEventElementRef={selectedEventElementRef}
          onEventUpdate={handleEventUpdate}
          onEventDelete={handleEventDelete}
          handlePanelClose={handlePanelClose}
          customRenderingStore={customRenderingStore}
          contentSlotRenderer={contentSlotRenderer}
          app={app}
        />
      )}
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
};
