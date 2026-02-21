import { Check } from '../../common/Icons';
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from './Primitives';
import { Event, ICalendarApp } from '../../../types';
import { useLocale } from '@/locale';
import { clipboardStore } from '@/utils/clipboardStore';

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
  const customContent = (app as any).callbacks?.renderEventContextMenu?.(
    event,
    onClose
  );

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
                <div className="flex items-center w-full">
                  <div className="w-4 shrink-0">
                    {isSelected && <Check className="w-3 h-3 text-primary" />}
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
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
