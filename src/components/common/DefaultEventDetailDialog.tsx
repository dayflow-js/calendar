import React, { useMemo, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Temporal } from 'temporal-polyfill';
import { EventDetailDialogProps } from '../../types/eventDetail';
import { isPlainDate } from '../../utils/temporal';
import { getDefaultCalendarRegistry } from '../../core/calendarRegistry';
import ColorPicker, { ColorOption } from './ColorPicker';
import RangePicker from './RangePicker';
import { CalendarApp } from '../../types';

interface DefaultEventDetailDialogProps extends EventDetailDialogProps {
  app?: CalendarApp;
}

/**
 * Default event detail dialog component (Dialog mode)
 * Content is consistent with DefaultEventDetailPanel, but displayed using Dialog/Modal
 */
const DefaultEventDetailDialog: React.FC<DefaultEventDetailDialogProps> = ({
  event,
  isOpen,
  isAllDay,
  onEventUpdate,
  onEventDelete,
  onClose,
  app,
}) => {
  const [editedEvent, setEditedEvent] = useState(event);

  // Sync state when event prop changes (e.g. if opened with a different event)
  useEffect(() => {
    setEditedEvent(event);
  }, [event]);

  // Get visible calendar type options
  const colorOptions: ColorOption[] = useMemo(() => {
    const registry = app ? app.getCalendarRegistry() : getDefaultCalendarRegistry();
    return registry.getVisible().map(cal => ({
      label: cal.name,
      value: cal.id,
    }));
  }, [app, app?.getCalendars()]);

  const handleSave = () => {
    onEventUpdate(editedEvent);
    onClose();
  };

  const convertToAllDay = () => {
    const plainDate = isPlainDate(editedEvent.start)
      ? editedEvent.start
      : editedEvent.start.toPlainDate();
    setEditedEvent({
      ...editedEvent,
      allDay: true,
      start: plainDate,
      end: plainDate,
    });
  };

  const convertToRegular = () => {
    const plainDate = isPlainDate(editedEvent.start)
      ? editedEvent.start
      : editedEvent.start.toPlainDate();
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
    setEditedEvent({
      ...editedEvent,
      allDay: false,
      start,
      end,
    });
  };

  const eventTimeZone = useMemo(() => {
    if (!isPlainDate(editedEvent.start)) {
      return (
        (editedEvent.start as any).timeZoneId ||
        (editedEvent.start as Temporal.ZonedDateTime).timeZoneId ||
        Temporal.Now.timeZoneId()
      );
    }

    if (editedEvent.end && !isPlainDate(editedEvent.end)) {
      return (
        (editedEvent.end as any).timeZoneId ||
        (editedEvent.end as Temporal.ZonedDateTime).timeZoneId ||
        Temporal.Now.timeZoneId()
      );
    }

    return Temporal.Now.timeZoneId();
  }, [editedEvent.end, editedEvent.start]);

  const handleAllDayRangeChange = (
    nextRange: [Temporal.ZonedDateTime, Temporal.ZonedDateTime]
  ) => {
    const [start, end] = nextRange;
    setEditedEvent({
      ...editedEvent,
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
        <div>
          <span className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Event Title</span>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={editedEvent.title}
                onChange={e => {
                  setEditedEvent({
                    ...editedEvent,
                    title: e.target.value,
                  });
                }}
                className="w-full border border-slate-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
              />
            </div>
            <ColorPicker
              options={colorOptions}
              value={editedEvent.calendarId || 'blue'}
              onChange={value => {
                setEditedEvent({
                  ...editedEvent,
                  calendarId: value,
                });
              }}
              registry={app?.getCalendarRegistry()}
            />
          </div>

          {!!editedEvent.allDay ? (
            <div className="mb-4">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Date Range</div>
              <RangePicker
                value={[editedEvent.start, editedEvent.end]}
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
                value={[editedEvent.start, editedEvent.end]}
                timeZone={eventTimeZone}
                onChange={(nextRange) => {
                  const [start, end] = nextRange;
                  setEditedEvent({
                    ...editedEvent,
                    start,
                    end,
                  });
                }}
                onOk={(nextRange) => {
                  const [start, end] = nextRange;
                  setEditedEvent({
                    ...editedEvent,
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
              value={editedEvent.description ?? ''}
              onChange={e =>
                setEditedEvent({
                  ...editedEvent,
                  description: e.target.value,
                })
              }
              rows={4}
              className="w-full border border-slate-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition resize-none"
              placeholder="Add a note..."
            />
          </div>

          <div className="flex space-x-2">
            {!editedEvent.allDay ? (
              <button
                className="px-3 py-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 text-sm font-medium transition"
                onClick={convertToAllDay}
              >
                Set as All-day
              </button>
            ) : (
              <button
                className="px-3 py-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 text-sm font-medium transition"
                onClick={convertToRegular}
              >
                Set as Timed Event
              </button>
            )}

            <button
              className="px-3 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-sm font-medium transition"
              onClick={() => {
                onEventDelete(event.id);
                onClose();
              }}
            >
              Delete
            </button>

            <button
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium transition ml-auto"
              onClick={handleSave}
            >
              Save
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
