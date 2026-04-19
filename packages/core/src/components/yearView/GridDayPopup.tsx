import { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useRef } from 'preact/hooks';

import { useLocale } from '@/locale';
import { ICalendarApp, Event } from '@/types';
import { temporalToVisualDate } from '@/utils';

interface GridDayPopupProps {
  date: Date;
  events: Event[];
  anchorEl: HTMLElement;
  /** Pre-calculated position so the popup renders at the right spot on frame 1. */
  position: { top: number; left: number };
  onClose: () => void;
  locale: string;
  app: ICalendarApp;
  customContent?: (date: Date, events: Event[]) => ComponentChildren;
  appTimeZone?: string;
}

export const GridDayPopup = ({
  date,
  events,
  anchorEl,
  position,
  onClose,
  locale,
  app,
  customContent,
  appTimeZone,
}: GridDayPopupProps) => {
  const { t } = useLocale();
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popupRef.current &&
        !popupRef.current.contains(target) &&
        !anchorEl.contains(target)
      ) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [anchorEl, onClose]);

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
          <div className='df-year-popup-empty'>No events</div>
        ) : (
          events.map(event => {
            const cal = event.calendarId
              ? calendarMap.get(event.calendarId)
              : undefined;
            const color = cal?.colors?.lineColor ?? '#3b82f6';

            let timeStr = '';
            if (!event.allDay && event.start) {
              const startDate = temporalToVisualDate(event.start, appTimeZone);
              timeStr = startDate.toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });
              if (event.end) {
                const endDate = temporalToVisualDate(event.end, appTimeZone);
                timeStr += ` – ${endDate.toLocaleTimeString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}`;
              }
            }

            return (
              <div key={event.id} className='df-year-popup-event'>
                <div
                  className='df-year-popup-dot'
                  style={{ backgroundColor: color }}
                />
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

  return createPortal(
    <div
      ref={popupRef}
      data-grid-day-popup
      className='df-year-popup df-animate-in df-fade-in df-zoom-in-95'
      style={{ top: position.top, left: position.left }}
    >
      {customContent ? customContent(date, events) : defaultContent}
    </div>,
    document.body
  );
};
