import { RangePicker } from '@dayflow/ui-range-picker';
import { createPortal } from 'preact/compat';
import { useMemo, useState, useEffect, useRef } from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import { getDefaultCalendarRegistry } from '@/core/calendarRegistry';
import { useLocale } from '@/locale';
import { dialogContainer } from '@/styles/classNames';
import { ICalendarApp } from '@/types';
import { EventDetailDialogProps } from '@/types/eventDetail';
import { isEventDeepEqual } from '@/utils/eventUtils';
import { isPlainDate } from '@/utils/temporal';
import { restoreVisualEventToCanonical } from '@/utils/timeUtils';

import { CalendarPicker, CalendarOption } from './CalendarPicker';
import { LoadingButton } from './LoadingButton';

interface DefaultEventDetailDialogProps extends EventDetailDialogProps {
  app?: ICalendarApp;
}

/**
 * Default event detail dialog component (Dialog mode)
 */
const DefaultEventDetailDialog = ({
  event,
  isOpen,
  onEventUpdate,
  onEventDelete,
  onClose,
  app,
}: DefaultEventDetailDialogProps) => {
  const [editedEvent, setEditedEvent] = useState(event);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const previousEventIdRef = useRef(event.id);
  const { t } = useLocale();

  useEffect(() => {
    setEditedEvent(event);
    if (previousEventIdRef.current !== event.id) {
      setIsSaving(false);
      setIsDeleting(false);
      previousEventIdRef.current = event.id;
    }
  }, [event]);

  const colorOptions: CalendarOption[] = useMemo(() => {
    const registry = app
      ? app.getCalendarRegistry()
      : getDefaultCalendarRegistry();
    return registry.getVisible().map(cal => ({
      label: cal.name,
      value: cal.id,
    }));
  }, [app, app?.getCalendars()]);

  const handleSave = async () => {
    if (isSaving || isDeleting) return;
    setIsSaving(true);
    try {
      await onEventUpdate(
        restoreVisualEventToCanonical(event, editedEvent, app?.timeZone)
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isSaving || isDeleting) return;
    setIsDeleting(true);
    try {
      await onEventDelete(event.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const hasChanges = useMemo(
    () => !isEventDeepEqual(event, editedEvent),
    [event, editedEvent]
  );

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
    const tz = app?.timeZone ?? Temporal.Now.timeZoneId();
    const start = Temporal.ZonedDateTime.from({
      year: plainDate.year,
      month: plainDate.month,
      day: plainDate.day,
      hour: 9,
      minute: 0,
      timeZone: tz,
    });
    const end = Temporal.ZonedDateTime.from({
      year: plainDate.year,
      month: plainDate.month,
      day: plainDate.day,
      hour: 10,
      minute: 0,
      timeZone: tz,
    });
    setEditedEvent({ ...editedEvent, allDay: false, start, end });
  };

  const eventTimeZone = useMemo(
    () => app?.timeZone ?? Temporal.Now.timeZoneId(),
    [app]
  );

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

  const isEditable = app?.canMutateFromUI(event.id) ?? false;
  const readOnlyConfig = app?.getReadOnlyConfig(event.id) as {
    draggable: boolean;
    viewable: boolean;
  };
  const isViewable = readOnlyConfig?.viewable !== false;
  const isPending = isSaving || isDeleting;

  const isSubscribed = useMemo(() => {
    if (!event.calendarId) return false;
    const calendar = app?.getCalendarRegistry().get(event.calendarId);
    return !!calendar?.subscription;
  }, [app, event.calendarId]);

  const shouldShowNotes =
    !isSubscribed || (editedEvent.description || '').trim() !== '';

  if (!isOpen || !isViewable) return null;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const handleBackdropClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-range-picker-popup]')) return;
    if (target === e.currentTarget) onClose();
  };

  const dialogContent = (
    <div
      className='df-portal'
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        zIndex: 9998,
      }}
      data-event-detail-dialog='true'
    >
      {/* Backdrop */}
      <div
        className='df-event-dialog__backdrop'
        style={{ position: 'absolute', inset: 0 }}
        onClick={handleBackdropClick}
      />

      {/* Dialog */}
      <div className={dialogContainer}>
        <button
          type='button'
          onClick={onClose}
          disabled={isPending}
          className='df-event-dialog__close'
          aria-label='Close'
        >
          <svg
            className='h-5 w-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>

        <div>
          <span className='df-form-label'>{t('eventTitle')}</span>
          <div className='df-form-row'>
            <div className='df-form-field'>
              <input
                id={`event-dialog-title-${editedEvent.id}`}
                name='title'
                type='text'
                value={editedEvent.title}
                readOnly={!isEditable || isPending}
                disabled={!isEditable || isPending}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setEditedEvent({
                    ...editedEvent,
                    title: (e.target as HTMLInputElement).value,
                  });
                }}
                className='df-form-input'
              />
            </div>
            {isEditable && (
              <CalendarPicker
                options={colorOptions}
                value={editedEvent.calendarId || 'blue'}
                disabled={isPending}
                onChange={value =>
                  setEditedEvent({ ...editedEvent, calendarId: value })
                }
                registry={app?.getCalendarRegistry()}
              />
            )}
          </div>

          {editedEvent.allDay ? (
            <div className='df-event-dialog__time-row'>
              <div className='df-form-label'>{t('dateRange')}</div>
              <RangePicker
                value={[editedEvent.start, editedEvent.end]}
                format='YYYY-MM-DD'
                showTime={false}
                timeZone={eventTimeZone}
                matchTriggerWidth
                disabled={!isEditable || isPending}
                onChange={handleAllDayRangeChange}
                onOk={handleAllDayRangeChange}
                locale={app?.state.locale}
              />
            </div>
          ) : (
            <div className='df-event-dialog__time-row'>
              <div className='df-form-label'>{t('timeRange')}</div>
              <RangePicker
                value={[editedEvent.start, editedEvent.end]}
                timeZone={eventTimeZone}
                disabled={!isEditable || isPending}
                onChange={(
                  nextRange: [Temporal.ZonedDateTime, Temporal.ZonedDateTime]
                ) => {
                  const [start, end] = nextRange;
                  setEditedEvent({ ...editedEvent, start, end });
                }}
                onOk={(
                  nextRange: [Temporal.ZonedDateTime, Temporal.ZonedDateTime]
                ) => {
                  const [start, end] = nextRange;
                  setEditedEvent({ ...editedEvent, start, end });
                }}
                locale={app?.state.locale}
              />
            </div>
          )}

          {shouldShowNotes && (
            <div className='df-event-dialog__notes-row'>
              <span className='df-form-label'>{t('note')}</span>
              <textarea
                id={`event-dialog-note-${editedEvent.id}`}
                name='note'
                value={editedEvent.description ?? ''}
                readOnly={!isEditable || isPending}
                disabled={!isEditable || isPending}
                onChange={e =>
                  setEditedEvent({
                    ...editedEvent,
                    description: (e.target as HTMLTextAreaElement).value,
                  })
                }
                rows={4}
                className='df-form-textarea'
                placeholder={t('addNotePlaceholder')}
              />
            </div>
          )}

          {isEditable && (
            <div className='df-form-actions'>
              {editedEvent.allDay ? (
                <button
                  type='button'
                  disabled={isPending}
                  className='df-tint-primary df-hover-primary-md df-btn-md'
                  onClick={convertToRegular}
                >
                  {t('setAsTimed')}
                </button>
              ) : (
                <button
                  type='button'
                  disabled={isPending}
                  className='df-tint-primary df-hover-primary-md df-btn-md'
                  onClick={convertToAllDay}
                >
                  {t('setAsAllDay')}
                </button>
              )}

              <LoadingButton
                type='button'
                disabled={isPending}
                className='df-fill-destructive df-hover-destructive df-btn-md'
                onClick={handleDelete}
                loading={isDeleting}
              >
                {t('delete')}
              </LoadingButton>

              <LoadingButton
                type='button'
                className={`df-fill-primary df-btn-md ${
                  hasChanges
                    ? 'df-shadow-primary df-hover-primary-solid'
                    : 'cursor-not-allowed opacity-50 grayscale-[0.5]'
                }`}
                style={{ marginLeft: 'auto' }}
                onClick={handleSave}
                disabled={!hasChanges || isPending}
                loading={isSaving}
              >
                {t('save')}
              </LoadingButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const portalTarget = document.body;
  if (!portalTarget) return null;

  return createPortal(dialogContent, portalTarget);
};

export default DefaultEventDetailDialog;
