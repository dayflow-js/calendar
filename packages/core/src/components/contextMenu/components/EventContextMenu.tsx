import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@dayflow/ui-context-menu';
import { Fragment } from 'preact';
import { useMemo } from 'preact/hooks';

import { Check } from '@/components/common/Icons';
import { useLocale } from '@/locale';
import { ContentSlot } from '@/renderer/ContentSlot';
import { Event, ICalendarApp, CalendarType } from '@/types';
import { clipboardStore } from '@/utils/clipboardStore';

interface EventContextMenuProps {
  event: Event;
  x: number;
  y: number;
  onClose: () => void;
  app: ICalendarApp;
  onDetailPanelToggle?: (id: string | null) => void;
  detailPanelKey: string;
  triggerEvent?: MouseEvent | TouchEvent;
}

const EventContextMenu = ({
  event,
  x,
  y,
  onClose,
  app,
  triggerEvent,
}: EventContextMenuProps) => {
  const { t } = useLocale();
  const calendars = app.getCalendars();

  const groupedCalendars = useMemo(() => {
    const hasGroups = calendars.some(c => !!c.source);
    if (!hasGroups) {
      return [{ group: null, items: calendars }];
    }
    const ungrouped: CalendarType[] = [];
    const groupMap = new Map<string, CalendarType[]>();

    for (const cal of calendars) {
      if (cal.source) {
        const list = groupMap.get(cal.source) || [];
        list.push(cal);
        groupMap.set(cal.source, list);
      } else {
        ungrouped.push(cal);
      }
    }

    const result: { group: string | null; items: CalendarType[] }[] = [];
    if (ungrouped.length > 0) {
      result.push({ group: null, items: ungrouped });
    }
    for (const [groupName, items] of groupMap.entries()) {
      result.push({ group: groupName, items });
    }
    return result;
  }, [calendars]);

  const mutableEventId = event._recurrenceMasterId ?? event.id;
  if (!app.canMutateFromUI(mutableEventId)) return null;

  const handleMoveToCalendar = (calendarId: string) => {
    app.updateEvent(mutableEventId, { calendarId });
    onClose();
  };

  const handleDelete = () => {
    app.deleteEvent(mutableEventId);
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
      app.deleteEvent(mutableEventId);
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
          {groupedCalendars.map(section => (
            <Fragment key={section.group ?? '__default'}>
              {section.group && (
                <ContextMenuLabel>{section.group}</ContextMenuLabel>
              )}
              {section.items.map(cal => {
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
            </Fragment>
          ))}
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
        generatorArgs={{ event, onClose, triggerEvent }}
        defaultContent={defaultContent}
      />
    </ContextMenu>
  );
};

export default EventContextMenu;
