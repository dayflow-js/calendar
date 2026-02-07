import React, { useMemo, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Temporal } from 'temporal-polyfill';
import { EventDetailDialogProps } from '../../types/eventDetail';
import { isPlainDate } from '../../utils/temporal';
import { getDefaultCalendarRegistry } from '../../core/calendarRegistry';
import { isEventEqual } from '../../utils/eventUtils';
import CalendarPicker, { CalendarOption } from './CalendarPicker';
import RangePicker from '../rangePicker';
import { CalendarApp } from '../../types';
import { useLocale } from '@/locale';
import { dialogContainer } from '@/styles/classNames';

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
  const { t } = useLocale();

  // Sync state when event prop changes (e.g. if opened with a different event)
  useEffect(() => {
    setEditedEvent(event);
  }, [event]);

  // Get visible calendar type options
  const colorOptions: CalendarOption[] = useMemo(() => {
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

  const hasChanges = useMemo(() => {
    return !isEventEqual(event, editedEvent);
  }, [event, editedEvent]);

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

  const isEditable = !app?.state.readOnly;
  const isViewable = app?.getReadOnlyConfig().viewable !== false;

  if (!isOpen || !isViewable) return null;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  // Handle backdrop click, but ignore clicks from popup components (e.g., RangePicker)
  const handleBackdropClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Check if clicked on RangePicker or ColorPicker popup content
    if (target.closest('[data-range-picker-popup]')) {
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
        className={dialogContainer}
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
          <span className="block text-xs text-gray-600 dark:text-gray-300 mb-1">{t('eventTitle')}</span>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={editedEvent.title}
                readOnly={!isEditable}
                disabled={!isEditable}
                onChange={e => {
                  setEditedEvent({
                    ...editedEvent,
                    title: e.target.value,
                  });
                }}
                className="w-full border border-slate-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
              />
            </div>
            {isEditable && (
              <CalendarPicker
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
            )}
          </div>

          {!!editedEvent.allDay ? (
            <div className="mb-4">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">{t('dateRange')}</div>
              <RangePicker
                value={[editedEvent.start, editedEvent.end]}
                format="YYYY-MM-DD"
                showTime={false}
                timeZone={eventTimeZone}
                matchTriggerWidth
                disabled={!isEditable}
                onChange={handleAllDayRangeChange}
                onOk={handleAllDayRangeChange}
                locale={app?.state.locale}
              />
            </div>
          ) : (
            <div className="mb-4">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">{t('timeRange')}</div>
              <RangePicker
                value={[editedEvent.start, editedEvent.end]}
                timeZone={eventTimeZone}
                disabled={!isEditable}
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
                locale={app?.state.locale}
              />
            </div>
          )}

          <div className="mb-4">
            <span className="block text-xs text-gray-600 dark:text-gray-300 mb-1">{t('note')}</span>
            <textarea
              value={editedEvent.description ?? ''}
              readOnly={!isEditable}
              disabled={!isEditable}
              onChange={e =>
                setEditedEvent({
                  ...editedEvent,
                  description: e.target.value,
                })
              }
              rows={4}
              className="w-full border border-slate-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition resize-none"
              placeholder={t('addNotePlaceholder')}
            />
          </div>

          {isEditable && (
            <div className="flex space-x-2">
              {!editedEvent.allDay ? (
                <button
                  className="px-3 py-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 text-sm font-medium transition"
                  onClick={convertToAllDay}
                >
                  {t('setAsAllDay')}
                </button>
              ) : (
                <button
                  className="px-3 py-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 text-sm font-medium transition"
                  onClick={convertToRegular}
                >
                  {t('setAsTimed')}
                </button>
              )}

              <button
                className="px-3 py-2 bg-destructive border border-border text-destructive-foreground rounded-lg hover:bg-destructive/90 text-sm font-medium transition"
                onClick={() => {
                  onEventDelete(event.id);
                  onClose();
                }}
              >
                {t('delete')}
              </button>

              <button
                className={`px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium transition ml-auto ${hasChanges
                  ? 'hover:bg-primary/90 shadow-lg shadow-primary/20'
                  : 'opacity-50 cursor-not-allowed grayscale-[0.5]'
                  }`}
                onClick={handleSave}
                disabled={!hasChanges}
              >
                {t('save')}
              </button>
            </div>
          )}


        </div>
      </div>
    </div>
  );

  const portalTarget = document.body;
  if (!portalTarget) return null;

  return ReactDOM.createPortal(dialogContent, portalTarget);
};

export default DefaultEventDetailDialog;
