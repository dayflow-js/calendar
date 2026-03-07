import { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useRef } from 'preact/hooks';

import { ICalendarApp, Event } from '@/types';
import { temporalToDate } from '@/utils/temporal';

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
}: GridDayPopupProps) => {
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
      <div className='border-b border-gray-100 px-4 py-3 dark:border-gray-700'>
        <div className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
          {dateLabel}
        </div>
      </div>
      <div className='max-h-60 overflow-y-auto py-1'>
        {events.length === 0 ? (
          <div className='px-4 py-3 text-center text-xs text-gray-400'>
            No events
          </div>
        ) : (
          events.map(event => {
            const cal = event.calendarId
              ? calendarMap.get(event.calendarId)
              : undefined;
            const color = cal?.colors?.lineColor ?? '#3b82f6';

            let timeStr = '';
            if (!event.allDay && event.start) {
              const startDate = temporalToDate(event.start);
              timeStr = startDate.toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });
              if (event.end) {
                const endDate = temporalToDate(event.end);
                timeStr += ` – ${endDate.toLocaleTimeString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}`;
              }
            }

            return (
              <div
                key={event.id}
                className='flex items-start gap-2.5 rounded px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800'
              >
                <div
                  className='mt-1.5 h-2 w-2 shrink-0 rounded-full'
                  style={{ backgroundColor: color }}
                />
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-xs font-medium text-gray-900 dark:text-gray-100'>
                    {event.title}
                  </div>
                  {timeStr && (
                    <div className='text-[10px] text-gray-500 dark:text-gray-400'>
                      {timeStr}
                    </div>
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
      className='animate-in fade-in zoom-in-95 fixed z-50 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl duration-100 dark:border-gray-700 dark:bg-gray-900'
      style={{ top: position.top, left: position.left }}
    >
      {customContent ? customContent(date, events) : defaultContent}
    </div>,
    document.body
  );
};
