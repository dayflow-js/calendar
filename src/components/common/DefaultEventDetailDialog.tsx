import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Temporal } from 'temporal-polyfill';
import { EventDetailDialogProps } from '@/types/eventDetail';
import { isPlainDate } from '@/utils/temporal';
import { getDefaultCalendarRegistry } from '@/core/calendarRegistry';
import ColorPicker, { ColorOption } from './ColorPicker';
import RangePicker from './RangePicker';

/**
 * Default event detail dialog component (Dialog mode)
 * Content is consistent with DefaultEventDetailPanel, but displayed using Dialog/Modal
 */
const DefaultEventDetailDialog: React.FC<EventDetailDialogProps> = ({
  event,
  isOpen,
  isAllDay,
  onEventUpdate,
  onEventDelete,
  onClose,
}) => {

  // Get visible calendar type options
  const colorOptions: ColorOption[] = useMemo(() => {
    const registry = getDefaultCalendarRegistry();
    return registry.getVisible().map(cal => ({
      label: cal.name,
      value: cal.id,
    }));
  }, []);

  const convertToAllDay = () => {
    const plainDate = isPlainDate(event.start)
      ? event.start
      : event.start.toPlainDate();
    onEventUpdate({
      ...event,
      allDay: true,
      start: plainDate,
      end: plainDate,
    });
  };

  const convertToRegular = () => {
    const plainDate = isPlainDate(event.start)
      ? event.start
      : event.start.toPlainDate();
    const start = Temporal.ZonedDateTime.from({
      year: plainDate.year,
      month: plainDate.month,
      day: plainDate.day,
      hour: 9,
      minute: 0,
      timeZone: Temporal.Now.timeZoneId(),
    });
    const end = Temporal.ZonedDateTime.from({
      year: plainDate.year,
      month: plainDate.month,
      day: plainDate.day,
      hour: 10,
      minute: 0,
      timeZone: Temporal.Now.timeZoneId(),
    });
    onEventUpdate({
      ...event,
      allDay: false,
      start,
      end,
    });
  };

  const eventTimeZone = useMemo(() => {
    if (!isPlainDate(event.start)) {
      return (
        (event.start as any).timeZoneId ||
        (event.start as Temporal.ZonedDateTime).timeZoneId ||
        Temporal.Now.timeZoneId()
      );
    }

    if (event.end && !isPlainDate(event.end)) {
      return (
        (event.end as any).timeZoneId ||
        (event.end as Temporal.ZonedDateTime).timeZoneId ||
        Temporal.Now.timeZoneId()
      );
    }

    return Temporal.Now.timeZoneId();
  }, [event.end, event.start]);

  const handleAllDayRangeChange = (
    nextRange: [Temporal.ZonedDateTime, Temporal.ZonedDateTime]
  ) => {
    const [start, end] = nextRange;
    onEventUpdate({
      ...event,
      start: start.toPlainDate(),
      end: end.toPlainDate(),
    });
  };

  if (!isOpen) return null;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  // Handle backdrop click, but ignore clicks from popup components (e.g., RangePicker)
  const handleBackdropClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Check if clicked on RangePicker or ColorPicker popup content
    if (target.closest('[data-rangepicker-popup]')) {
      return;
    }

    // Only close when actually clicking the backdrop
    if (target === e.currentTarget) {
      onClose();
    }
  };

  const dialogContent = (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ pointerEvents: 'auto', zIndex: 9998 }}
      data-event-detail-dialog="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/80"
        onClick={handleBackdropClick}
      />

      {/* Dialog - relative positioning ensures it appears above backdrop */}
      <div
        className="relative bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 rounded-lg p-6 max-w-md w-full mx-4"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 transition"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Content */}
        <div className="pr-8">
          <span className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Event Title</span>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={event.title}
                onChange={e => {
                  onEventUpdate({
                    ...event,
                    title: e.target.value,
                  });
                }}
                className="w-full border border-slate-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-500 transition"
              />
            </div>
            <ColorPicker
              options={colorOptions}
              value={event.calendarId || 'blue'}
              onChange={value => {
                onEventUpdate({
                  ...event,
                  calendarId: value,
                });
              }}
            />
          </div>

          {isAllDay ? (
            <div className="mb-4">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Date Range</div>
              <RangePicker
                value={[event.start, event.end]}
                format="YYYY-MM-DD"
                showTime={false}
                timeZone={eventTimeZone}
                matchTriggerWidth
                onChange={handleAllDayRangeChange}
                onOk={handleAllDayRangeChange}
              />
            </div>
          ) : (
            <div className="mb-4">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Time Range</div>
              <RangePicker
                value={[event.start, event.end]}
                timeZone={eventTimeZone}
                onChange={(nextRange) => {
                  const [start, end] = nextRange;
                  onEventUpdate({
                    ...event,
                    start,
                    end,
                  });
                }}
                onOk={(nextRange) => {
                  const [start, end] = nextRange;
                  onEventUpdate({
                    ...event,
                    start,
                    end,
                  });
                }}
              />
            </div>
          )}

          <div className="mb-4">
            <span className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Note</span>
            <textarea
              value={event.description ?? ''}
              onChange={e =>
                onEventUpdate({
                  ...event,
                  description: e.target.value,
                })
              }
              rows={4}
              className="w-full border border-slate-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-500 transition resize-none"
              placeholder="Add a note..."
            />
          </div>

          <div className="flex space-x-2">
            {!isAllDay ? (
              <button
                className="px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 text-sm font-medium transition"
                onClick={convertToAllDay}
              >
                Set as All-day
              </button>
            ) : (
              <button
                className="px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 text-sm font-medium transition"
                onClick={convertToRegular}
              >
                Set as Timed Event
              </button>
            )}

            <button
              className="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 text-sm font-medium transition"
              onClick={() => {
                onEventDelete(event.id);
                onClose();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const portalTarget = document.body;
  if (!portalTarget) return null;

  return ReactDOM.createPortal(dialogContent, portalTarget);
};

export default DefaultEventDetailDialog;
