import { createPortal } from 'preact/compat';
import { useEffect, useRef } from 'preact/hooks';

import { TaskCheckbox } from '@/components/calendarEvent/components/TaskCheckbox';
import type { EventActivateHandler } from '@/components/common/useEventActivation';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useLocale } from '@/locale';
import { ContentSlot } from '@/renderer/ContentSlot';
import { ICalendarApp, Event } from '@/types';
import {
  formatTime,
  formatTimeRangeFormatted,
  getViewTimeFormat,
  temporalToVisualDate,
} from '@/utils';
import { isTask } from '@/utils/taskUtils';

interface GridDayPopupProps {
  date: Date;
  events: Event[];
  anchorEl: HTMLElement;
  /** Pre-calculated position so the popup renders at the right spot on frame 1. */
  position: { top: number; left: number };
  onClose: () => void;
  locale: string;
  app: ICalendarApp;
  appTimeZone?: string;
  selectedEventId?: string | null;
  /** Opens or selects an event, following `eventDetailTrigger`. */
  onActivateEvent?: EventActivateHandler;
}

export const GridDayPopup = ({
  date,
  events,
  anchorEl,
  position,
  onClose,
  locale,
  app,
  appTimeZone,
  selectedEventId,
  onActivateEvent,
}: GridDayPopupProps) => {
  const { t } = useLocale();
  const timeFormat = getViewTimeFormat(app);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popupRef.current &&
        !popupRef.current.contains(target) &&
        !anchorEl.contains(target) &&
        // Working in the detail panel opened from this popup keeps it open.
        !(target as Element).closest?.(
          '[data-event-detail-panel], [data-event-detail-dialog], [data-range-picker-popup], [data-calendar-picker-dropdown]'
        )
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleDown);
    return () => {
      document.removeEventListener('mousedown', handleDown);
    };
  }, [anchorEl, onClose]);

  // Non-modal popup: Escape closes it and focus returns to the day cell, but
  // Tab is free to leave.
  useDialogFocus(popupRef, { onClose, trapFocus: false });

  const calendars = app.getCalendars();
  const calendarMap = new Map(calendars.map(c => [c.id, c]));

  const dateLabel = date.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const defaultContent = (
    <>
      <div className='df-year-popup-header'>
        <div className='df-year-popup-title'>{dateLabel}</div>
      </div>
      <div className='df-year-popup-body'>
        {events.length === 0 ? (
          <div className='df-year-popup-empty'>{t('noEvents')}</div>
        ) : (
          events.map(event => {
            const cal = event.calendarId
              ? calendarMap.get(event.calendarId)
              : undefined;
            const color = cal?.colors?.lineColor ?? '#3b82f6';

            let timeStr = '';
            if (!event.allDay && event.start) {
              const startDate = temporalToVisualDate(event.start, appTimeZone);
              if (event.end) {
                const endDate = temporalToVisualDate(event.end, appTimeZone);
                timeStr = formatTimeRangeFormatted(
                  startDate.getHours(),
                  startDate.getMinutes(),
                  endDate.getHours(),
                  endDate.getMinutes(),
                  timeFormat
                );
              } else {
                timeStr = formatTime(
                  startDate.getHours(),
                  startDate.getMinutes(),
                  timeFormat
                );
              }
            }

            const panelKey = `${event.id}::grid-${date.getTime()}`;
            const activate = (e: MouseEvent, gesture: 'click' | 'dblclick') => {
              e.stopPropagation();
              onActivateEvent?.(event.id, panelKey, e, gesture);
            };
            return (
              <div
                key={event.id}
                className='df-year-popup-event'
                data-event-id={event.id}
                data-detail-panel-key={panelKey}
                data-kind={event.kind ?? 'event'}
                data-task-completed={String(!!event.task?.completed)}
                data-selected={String(selectedEventId === event.id)}
                role={onActivateEvent ? 'button' : undefined}
                tabIndex={onActivateEvent ? 0 : undefined}
                onClick={e => activate(e as unknown as MouseEvent, 'click')}
                onDblClick={e =>
                  activate(e as unknown as MouseEvent, 'dblclick')
                }
                onKeyDown={e => {
                  if (e.key !== 'Enter' || e.target !== e.currentTarget) return;
                  // The keyboard has no double click; Enter opens either way.
                  activate(e as unknown as MouseEvent, 'click');
                  if (app.getEventDetailTrigger() !== 'click')
                    activate(e as unknown as MouseEvent, 'dblclick');
                }}
              >
                {isTask(event) ? (
                  <TaskCheckbox
                    event={event}
                    app={app}
                    isEditable={app.canMutateFromUI(
                      event._recurrenceMasterId ?? event.id
                    )}
                    color={color}
                  />
                ) : (
                  <div
                    className='df-year-popup-dot'
                    style={{ backgroundColor: color }}
                  />
                )}
                <div className='df-year-popup-event-main'>
                  <div className='df-year-popup-event-title'>{event.title}</div>
                  {event.allDay && (
                    <div className='df-year-popup-event-meta'>
                      {t('allDay')}
                    </div>
                  )}
                  {timeStr && (
                    <div className='df-year-popup-event-meta'>{timeStr}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  // Route custom popup content through the ContentSlot system so framework
  // adapters (React/Vue/Angular/Svelte) can portal their own (non-Preact)
  // content into the placeholder. Custom content is supplied as the
  // `gridPopupContent` slot on the framework's <DayFlowCalendar>, NOT through
  // the view config — feeding foreign vnodes to Preact would crash (the `_H`
  // hooks error). When no adapter claims the slot, the built-in default shows.
  return createPortal(
    <div
      ref={popupRef}
      data-grid-day-popup
      role='dialog'
      aria-label={dateLabel}
      className='df-year-popup df-animate-in df-fade-in df-zoom-in-95'
      style={{ top: position.top, left: position.left }}
    >
      <ContentSlot
        generatorName='gridPopupContent'
        generatorArgs={{ date, events }}
        defaultContent={defaultContent}
      />
    </div>,
    document.body
  );
};
