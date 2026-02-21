import { useState, useCallback, useRef } from 'preact/hooks';
import { ICalendarApp, Event } from '../../types';
import { generateUniKey } from '../../utils/helpers';
import { dateToZonedDateTime } from '../../utils/temporal';

export interface QuickCreateController {
  isQuickCreateOpen: boolean;
  setIsQuickCreateOpen: (open: boolean) => void;
  quickCreateAnchorRef: { current: HTMLElement | null };
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
  mobileDraftEvent: Event | null;
  setMobileDraftEvent: (event: Event | null) => void;
  handleAddButtonClick: (e: any) => void;
}

/**
 * Manages the "add event" affordance for both desktop (QuickCreateEventPopup)
 * and mobile (MobileEventDrawer with a pre-populated draft event).
 */
export function useQuickCreateController(
  app: ICalendarApp,
  isMobile: boolean
): QuickCreateController {
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const quickCreateAnchorRef = useRef<HTMLElement>(null!);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [mobileDraftEvent, setMobileDraftEvent] = useState<Event | null>(null);

  const handleAddButtonClick = useCallback(
    (e: any) => {
      const isEditable = !app.state.readOnly;
      if (!isEditable) return;

      if (isMobile) {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        now.setHours(now.getHours() + 1);

        const end = new Date(now);
        end.setHours(end.getHours() + 1);

        const draft: Event = {
          id: generateUniKey(),
          title: '',
          start: dateToZonedDateTime(now),
          end: dateToZonedDateTime(end),
          calendarId:
            app.getCalendars().find(c => c.isVisible !== false)?.id ||
            app.getCalendars()[0]?.id,
        };
        setMobileDraftEvent(draft);
        setIsMobileDrawerOpen(true);
        return;
      }

      if (isQuickCreateOpen) {
        setIsQuickCreateOpen(false);
      } else {
        (quickCreateAnchorRef as any).current = e.currentTarget;
        setIsQuickCreateOpen(true);
      }
    },
    [isMobile, isQuickCreateOpen, app]
  );

  return {
    isQuickCreateOpen,
    setIsQuickCreateOpen,
    quickCreateAnchorRef,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    mobileDraftEvent,
    setMobileDraftEvent,
    handleAddButtonClick,
  };
}
