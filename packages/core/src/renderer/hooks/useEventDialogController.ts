import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';

import { ICalendarApp, Event, EventDetailDialogRenderer } from '@/types';
import { isPlainDate } from '@/utils/temporal';

export interface DialogProps {
  event: Event;
  isOpen: boolean;
  isAllDay: boolean;
  onEventUpdate: (evt: Event) => void;
  onEventDelete: (id: string) => void;
  onClose: () => void;
  app: ICalendarApp;
}

export interface EventDialogController {
  detailPanelEventId: string | null;
  setDetailPanelEventId: (id: string | null) => void;
  /** Memoized props object ready to spread into the dialog component. */
  dialogProps: DialogProps | null;
}

/**
 * Manages the event detail dialog/panel lifecycle:
 * - Resets state on app instance changes (client-side navigation).
 * - Memoizes dialogProps so ContentSlot only re-registers when data changes.
 * - Exposes stable handler callbacks (close, update, delete).
 *
 * `tick` is passed in from useAppSubscription so dialogProps stays fresh
 * when the underlying event is edited while the dialog is open.
 */
export function useEventDialogController(
  app: ICalendarApp,
  effectiveEventDetailDialog: EventDetailDialogRenderer | undefined,
  tick: number
): EventDialogController {
  const [detailPanelEventId, setDetailPanelEventId] = useState<string | null>(
    null
  );

  // Reset when the app instance is replaced (client-side navigation).
  useEffect(() => {
    setDetailPanelEventId(null);
  }, [app]);

  const handleDialogClose = useCallback(() => {
    setDetailPanelEventId(null);
    app.selectEvent(null);
  }, [app]);

  const handleDialogEventUpdate = useCallback(
    (evt: Event) => app.updateEvent(evt.id, evt),
    [app]
  );

  const handleDialogEventDelete = useCallback(
    (id: string) => {
      app.deleteEvent(id);
      setDetailPanelEventId(null);
      app.selectEvent(null);
    },
    [app]
  );

  // tick is included so the event object stays fresh when app state changes
  // (e.g. user edits event title while dialog is open).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dialogProps = useMemo<DialogProps | null>(() => {
    if (!effectiveEventDetailDialog || !detailPanelEventId) return null;

    const rawEventId = detailPanelEventId.split('::')[0];
    const selectedEvent = app
      .getEvents()
      .find((e: Event) => e.id === rawEventId);
    if (!selectedEvent) return null;

    return {
      event: selectedEvent,
      isOpen: true,
      isAllDay: isPlainDate(selectedEvent.start),
      onEventUpdate: handleDialogEventUpdate,
      onEventDelete: handleDialogEventDelete,
      onClose: handleDialogClose,
      app,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tick,
    detailPanelEventId,
    effectiveEventDetailDialog,
    handleDialogClose,
    handleDialogEventUpdate,
    handleDialogEventDelete,
    app,
  ]);

  return { detailPanelEventId, setDetailPanelEventId, dialogProps };
}
