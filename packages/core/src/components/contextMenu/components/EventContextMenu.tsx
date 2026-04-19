import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@dayflow/ui-context-menu';

import { Check } from '@/components/common/Icons';
import { useLocale } from '@/locale';
import { ContentSlot } from '@/renderer/ContentSlot';
import { Event, ICalendarApp } from '@/types';
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
  if (!app.canMutateFromUI(event.id)) return null;

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

  const defaultContent = (
    <>
      {/* Group 1: Calendar Submenu */}
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
                <div className='df-context-menu-calendar-item'>
                  <div className='df-context-menu-calendar-check-wrap'>
                    {isSelected && (
                      <Check className='df-text-primary df-context-menu-calendar-check' />
                    )}
                  </div>
                  <div className='df-context-menu-calendar-info'>
                    <div
                      className='df-context-menu-calendar-dot'
                      style={{ backgroundColor: cal.colors.lineColor }}
                    />
                    <span
                      className='df-context-menu-calendar-label'
                      data-selected={isSelected}
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

      {/* Group 2: Delete, Cut, Copy */}
      <ContextMenuItem onClick={handleDelete} danger>
        {t('delete') || 'Delete'}
      </ContextMenuItem>
      <ContextMenuItem onClick={handleCut}>{t('cut') || 'Cut'}</ContextMenuItem>
      <ContextMenuItem onClick={handleCopy}>
        {t('copy') || 'Copy'}
      </ContextMenuItem>
    </>
  );

  return (
    <ContextMenu x={x} y={y} onClose={onClose}>
      <ContentSlot
        generatorName='eventContextMenu'
        generatorArgs={{ event, onClose }}
        defaultContent={defaultContent}
      />
    </ContextMenu>
  );
};

export default EventContextMenu;
