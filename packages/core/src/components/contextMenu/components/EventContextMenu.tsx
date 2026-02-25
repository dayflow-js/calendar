import { Check } from '@/components/common/Icons';
import { useLocale } from '@/locale';
import { Event, ICalendarApp, TNode } from '@/types';
import { clipboardStore } from '@/utils/clipboardStore';

import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from './Primitives';

interface EventContextMenuProps {
  event: Event;
  x: number;
  y: number;
  onClose: () => void;
  app: ICalendarApp;
  onDetailPanelToggle?: (id: string | null) => void;
  detailPanelKey: string;
}

const EventContextMenu = ({
  event,
  x,
  y,
  onClose,
  app,
}: EventContextMenuProps) => {
  const { t } = useLocale();
  const calendars = app.getCalendars();

  const handleMoveToCalendar = (calendarId: string) => {
    app.updateEvent(event.id, { calendarId });
    onClose();
  };

  const handleDelete = () => {
    app.deleteEvent(event.id);
    onClose();
  };

  const handleCopy = async () => {
    try {
      const eventData = JSON.stringify(event, null, 2);
      await navigator.clipboard.writeText(eventData);
      clipboardStore.setEvent(event);
    } catch (err) {
      console.error('Failed to copy event: ', err);
    }
    onClose();
  };

  const handleCut = async () => {
    try {
      const eventData = JSON.stringify(event, null, 2);
      await navigator.clipboard.writeText(eventData);
      clipboardStore.setEvent(event);
      app.deleteEvent(event.id);
    } catch (err) {
      console.error('Failed to cut event: ', err);
    }
    onClose();
  };

  // Custom user slot
  // oxlint-disable-next-line typescript/no-explicit-any
  const callbacks = (app as any).callbacks;
  const customContent = callbacks?.renderEventContextMenu?.(
    event,
    onClose
  ) as TNode;

  return (
    <ContextMenu x={x} y={y} onClose={onClose}>
      {/* Group 2: Calendar Submenu */}
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          {t('calendars') || 'Calendars'}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {calendars.map(cal => {
            const isSelected = cal.id === event.calendarId;
            return (
              <ContextMenuItem
                key={cal.id}
                onClick={() => handleMoveToCalendar(cal.id)}
              >
                <div className='flex w-full items-center'>
                  <div className='w-4 shrink-0'>
                    {isSelected && <Check className='h-3 w-3 text-primary' />}
                  </div>
                  <div className='flex min-w-0 items-center gap-1.5'>
                    <div
                      className='h-3 w-3 shrink-0 rounded-sm'
                      style={{ backgroundColor: cal.colors.lineColor }}
                    />
                    <span
                      className={`truncate ${isSelected ? 'font-semibold' : ''}`}
                    >
                      {cal.name}
                    </span>
                  </div>
                </div>
              </ContextMenuItem>
            );
          })}
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSeparator />

      {/* Group 3: Delete, Cut, Copy */}
      <ContextMenuItem onClick={handleDelete} danger>
        {t('delete') || 'Delete'}
      </ContextMenuItem>
      <ContextMenuItem onClick={handleCut}>{t('cut') || 'Cut'}</ContextMenuItem>
      <ContextMenuItem onClick={handleCopy}>
        {t('copy') || 'Copy'}
      </ContextMenuItem>

      {/* Group 4: Custom Slot */}
      {customContent && (
        <>
          <ContextMenuSeparator />
          {customContent}
        </>
      )}
    </ContextMenu>
  );
};

export default EventContextMenu;
