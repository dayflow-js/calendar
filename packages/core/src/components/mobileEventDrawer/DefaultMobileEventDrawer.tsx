import { JSX } from 'preact';
import { createPortal } from 'preact/compat';
import { useState, useEffect, useMemo } from 'preact/hooks';

import {
  CalendarPicker,
  CalendarOption,
} from '@/components/common/CalendarPicker';
import { MiniCalendar } from '@/components/common/MiniCalendar';
import { useLocale } from '@/locale';
import {
  Event as CalendarEvent,
  MobileEventProps,
  CalendarType,
} from '@/types';
import {
  formatTime,
  isEventDeepEqual,
  restoreVisualEventToCanonical,
} from '@/utils';
import { temporalToDate, dateToZonedDateTime } from '@/utils/temporal';
import { dateToPlainDate } from '@/utils/temporalTypeGuards';

import { Switch } from './components/Switch';
import { TimePickerWheel } from './components/TimePickerWheel';

export const MobileEventDrawer = ({
  isOpen,
  onClose,
  onSave,
  onEventDelete,
  draftEvent,
  app,
  timeFormat = '24h',
}: MobileEventProps) => {
  const { locale, t } = useLocale();
  const readOnlyConfig = app.getReadOnlyConfig(draftEvent?.id) as {
    draggable: boolean;
    viewable: boolean;
  };
  const isEditable = app.canMutateFromUI(draftEvent?.id);
  const isViewable = readOnlyConfig.viewable !== false;

  const [notes, setNotes] = useState('');

  // Check if it's a subscribed calendar
  const isSubscribed = useMemo(() => {
    if (!draftEvent?.calendarId) return false;
    const calendar = app.getCalendarRegistry().get(draftEvent.calendarId);
    return !!calendar?.subscription;
  }, [app, draftEvent?.calendarId]);

  // If subscribed calendar and no notes, hide notes field
  const shouldShowNotes = !isSubscribed || notes.trim() !== '';

  const [title, setTitle] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  // Independent visible month states for date pickers
  const [startVisibleMonth, setStartVisibleMonth] = useState(new Date());
  const [endVisibleMonth, setEndVisibleMonth] = useState(new Date());

  // Expand states
  const [expandedPicker, setExpandedPicker] = useState<
    'start-date' | 'start-time' | 'end-date' | 'end-time' | null
  >(null);

  // Animation states
  const [isVisible, setIsVisible] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  // Persist isEditing state to avoid flickering during exit animation
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
    } else {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, 300); // Match CSS animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && draftEvent) {
      const editing = app.getEvents().some(e => e.id === draftEvent.id);
      setIsEditing(editing);
    }
  }, [isOpen, draftEvent, app]);

  const calendars = app.getCalendars();
  const calendarOptions: CalendarOption[] = calendars.map(
    (cal: CalendarType) => ({
      label: cal.name,
      value: cal.id,
    })
  );

  // Ensure calendarId is valid when calendars change or drawer opens
  useEffect(() => {
    if (isOpen && calendars.length > 0) {
      const isCurrentIdValid = calendars.some(c => c.id === calendarId);
      // If current ID is 'blue' (fallback) or empty, or simply not in the list (and not a draft event specific ID that might be hidden?),
      // strictly speaking if it's the fallback 'blue', we should switch.
      // We also check for '' just in case.
      if (!isCurrentIdValid && (calendarId === 'blue' || calendarId === '')) {
        setCalendarId(calendars[0].id);
      }
    }
  }, [calendars, isOpen, calendarId]);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      // Robust lock for iOS
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && draftEvent) {
      setTitle(draftEvent.title || '');
      setCalendarId(draftEvent.calendarId || calendars[0]?.id || 'blue');
      setIsAllDay(draftEvent.allDay || false);
      setNotes(draftEvent.description || '');

      if (draftEvent.start) {
        try {
          const start = temporalToDate(draftEvent.start);
          setStartDate(start);
          setStartVisibleMonth(start);
        } catch (e) {
          console.error('Failed to parse start date', e);
          const now = new Date();
          setStartDate(now);
          setStartVisibleMonth(now);
        }
      }

      if (draftEvent.end) {
        try {
          const end = temporalToDate(draftEvent.end);
          setEndDate(end);
          setEndVisibleMonth(end);
        } catch (e) {
          console.error('Failed to parse end date', e);
          const now = new Date();
          setEndDate(now);
          setEndVisibleMonth(now);
        }
      }
    } else if (isOpen && !draftEvent) {
      // Default init if no draft event (fallback)
      setCalendarId(calendars[0]?.id || 'blue');
      setNotes('');
      const now = new Date();
      now.setMinutes(0, 0, 0);
      setStartDate(now);
      setStartVisibleMonth(now);
      setEndDate(new Date(now.getTime() + 60 * 60 * 1000));
      setEndVisibleMonth(now);
    }
  }, [isOpen, draftEvent]);

  const hasChanges = useMemo(() => {
    if (!isOpen || !draftEvent) return false;

    const finalStart = new Date(startDate);
    const finalEnd = new Date(endDate);

    const currentEvent: CalendarEvent = {
      ...draftEvent,
      title,
      calendarId,
      allDay: isAllDay,
      description: notes,
      start: isAllDay
        ? dateToPlainDate(finalStart)
        : dateToZonedDateTime(finalStart, app.timeZone),
      end: isAllDay
        ? dateToPlainDate(finalEnd)
        : dateToZonedDateTime(finalEnd, app.timeZone),
    };

    return !isEventDeepEqual(
      draftEvent,
      restoreVisualEventToCanonical(draftEvent, currentEvent, app.timeZone)
    );
  }, [
    isOpen,
    draftEvent,
    title,
    calendarId,
    isAllDay,
    startDate,
    endDate,
    notes,
  ]);

  if (!isVisible || !isViewable) return null;

  const handleSave = () => {
    if (!draftEvent) return;

    const finalStart = new Date(startDate);
    const finalEnd = new Date(endDate);

    const updated = {
      ...draftEvent,
      title,
      calendarId,
      allDay: isAllDay,
      start: isAllDay
        ? dateToPlainDate(finalStart)
        : dateToZonedDateTime(finalStart, app.timeZone),
      end: isAllDay
        ? dateToPlainDate(finalEnd)
        : dateToZonedDateTime(finalEnd, app.timeZone),
    };
    onSave(
      restoreVisualEventToCanonical(
        draftEvent,
        updated as CalendarEvent,
        app.timeZone
      )
    );
  };

  const toggleExpand = (
    key: 'start-date' | 'start-time' | 'end-date' | 'end-time'
  ) => {
    setExpandedPicker(prev => (prev === key ? null : key));
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const handleDateChange = (type: 'start' | 'end', d: Date) => {
    if (type === 'start') {
      const newDate = new Date(d);
      newDate.setHours(startDate.getHours(), startDate.getMinutes());

      const timeDiff = newDate.getTime() - startDate.getTime();
      setStartDate(newDate);

      // Sync End Date (maintain duration)
      const newEndDate = new Date(endDate.getTime() + timeDiff);
      setEndDate(newEndDate);
    } else {
      const newDate = new Date(d);
      newDate.setHours(endDate.getHours(), endDate.getMinutes());
      setEndDate(newDate);
    }
  };

  const handleStartTimeChange = (newStart: Date) => {
    const duration = endDate.getTime() - startDate.getTime();
    setStartDate(newStart);
    setEndDate(new Date(newStart.getTime() + duration));
  };

  const handleEndTimeChange = (newEnd: Date) => {
    // If new end time is before start time, shift start time back to maintain duration
    if (newEnd < startDate) {
      const duration = endDate.getTime() - startDate.getTime();
      setEndDate(newEnd);
      setStartDate(new Date(newEnd.getTime() - duration));
    } else {
      setEndDate(newEnd);
    }
  };

  const handleMonthChange = (type: 'start' | 'end', offset: number) => {
    if (type === 'start') {
      setStartVisibleMonth(prev => {
        const next = new Date(prev);
        next.setMonth(prev.getMonth() + offset);
        return next;
      });
    } else {
      setEndVisibleMonth(prev => {
        const next = new Date(prev);
        next.setMonth(prev.getMonth() + offset);
        return next;
      });
    }
  };

  return createPortal(
    <div className='df-portal df-mobile-event-drawer'>
      <div
        className='df-mobile-event-drawer-backdrop'
        data-closing={String(isClosing)}
        onClick={onClose}
      />

      <div
        className={`df-mobile-event-drawer-panel ${isClosing ? 'df-animate-slide-down' : 'df-animate-slide-up'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className='df-mobile-event-drawer-header'>
          <button
            type='button'
            onClick={onClose}
            className='df-mobile-event-drawer-header-action'
          >
            {t('cancel')}
          </button>
          <span className='df-mobile-event-drawer-title'>
            {!isEditable && isEditing
              ? t('viewEvent')
              : isEditing
                ? t('editEvent')
                : t('newEvent')}
          </span>
          {isEditable && (
            <button
              type='button'
              onClick={handleSave}
              disabled={!hasChanges}
              className={`df-mobile-event-drawer-header-action df-mobile-event-drawer-header-action-primary ${hasChanges ? '' : 'df-mobile-event-drawer-header-action-disabled'}`}
            >
              {isEditing ? t('done') : t('create')}
            </button>
          )}
          {!isEditable && (
            <span className='df-mobile-event-drawer-header-spacer' />
          )}
        </div>

        <div className='df-mobile-event-drawer-body'>
          <div className='df-mobile-event-drawer-section df-mobile-event-drawer-section-framed'>
            <input
              type='text'
              placeholder={t('titlePlaceholder')}
              value={title}
              onChange={(
                e: JSX.TargetedEvent<HTMLInputElement, globalThis.Event>
              ) => isEditable && setTitle(e.currentTarget.value)}
              readOnly={!isEditable}
              className='df-mobile-event-drawer-title-input'
              autoFocus={isEditable}
            />
          </div>

          {calendars.length > 0 && (
            <div className='df-mobile-event-drawer-section df-mobile-event-drawer-section-framed'>
              <div className='df-mobile-event-drawer-row'>
                <span className='df-mobile-event-drawer-label'>
                  {t('calendar')}
                </span>
                <CalendarPicker
                  options={calendarOptions}
                  value={calendarId}
                  onChange={
                    isEditable
                      ? setCalendarId
                      : () => {
                          /* noop */
                        }
                  }
                  registry={app.getCalendarRegistry()}
                  variant='mobile'
                  disabled={!isEditable}
                />
              </div>
            </div>
          )}

          <div className='df-mobile-event-drawer-section df-mobile-event-drawer-section-framed'>
            <div className='df-mobile-event-drawer-row'>
              <span className='df-mobile-event-drawer-label'>
                {t('allDay')}
              </span>
              <Switch
                checked={isAllDay}
                onChange={
                  isEditable
                    ? setIsAllDay
                    : () => {
                        /* noop */
                      }
                }
                disabled={!isEditable}
              />
            </div>
          </div>

          <div className='df-mobile-event-drawer-section'>
            <div className='df-mobile-event-drawer-row df-mobile-event-drawer-row-padded'>
              <span className='df-mobile-event-drawer-label'>
                {t('starts')}
              </span>
              <div className='df-mobile-event-drawer-controls'>
                <button
                  type='button'
                  className='df-mobile-event-drawer-picker-trigger'
                  data-active={String(expandedPicker === 'start-date')}
                  onClick={() => isEditable && toggleExpand('start-date')}
                  disabled={!isEditable}
                  aria-expanded={expandedPicker === 'start-date'}
                >
                  {formatDate(startDate)}
                </button>
                {!isAllDay && (
                  <button
                    type='button'
                    className='df-mobile-event-drawer-picker-trigger'
                    data-active={String(expandedPicker === 'start-time')}
                    onClick={() => isEditable && toggleExpand('start-time')}
                    disabled={!isEditable}
                    aria-expanded={expandedPicker === 'start-time'}
                  >
                    {formatTime(
                      startDate.getHours() + startDate.getMinutes() / 60,
                      0,
                      timeFormat
                    )}
                  </button>
                )}
              </div>
            </div>

            <div
              className='df-mobile-event-drawer-expander'
              data-kind='calendar'
              data-expanded={String(expandedPicker === 'start-date')}
            >
              <div className='df-mobile-event-drawer-expander-content'>
                <MiniCalendar
                  currentDate={startDate}
                  visibleMonth={startVisibleMonth}
                  onDateSelect={d => handleDateChange('start', d)}
                  onMonthChange={offset => handleMonthChange('start', offset)}
                  showHeader
                  events={app.getEvents()}
                  calendarRegistry={app.getCalendarRegistry()}
                  timeZone={app.timeZone}
                />
              </div>
            </div>
            <div
              className='df-mobile-event-drawer-expander'
              data-kind='time'
              data-expanded={String(expandedPicker === 'start-time')}
            >
              <div className='df-mobile-event-drawer-expander-content'>
                <TimePickerWheel
                  date={startDate}
                  onChange={handleStartTimeChange}
                  timeFormat={timeFormat}
                />
              </div>
            </div>
          </div>

          <div className='df-mobile-event-drawer-section'>
            <div className='df-mobile-event-drawer-row df-mobile-event-drawer-row-padded'>
              <span className='df-mobile-event-drawer-label'>{t('ends')}</span>
              <div className='df-mobile-event-drawer-controls'>
                <button
                  type='button'
                  className='df-mobile-event-drawer-picker-trigger'
                  data-active={String(expandedPicker === 'end-date')}
                  onClick={() => isEditable && toggleExpand('end-date')}
                  disabled={!isEditable}
                  aria-expanded={expandedPicker === 'end-date'}
                >
                  {formatDate(endDate)}
                </button>
                {!isAllDay && (
                  <button
                    type='button'
                    className='df-mobile-event-drawer-picker-trigger'
                    data-active={String(expandedPicker === 'end-time')}
                    onClick={() => isEditable && toggleExpand('end-time')}
                    disabled={!isEditable}
                    aria-expanded={expandedPicker === 'end-time'}
                  >
                    {formatTime(
                      endDate.getHours() + endDate.getMinutes() / 60,
                      0,
                      timeFormat
                    )}
                  </button>
                )}
              </div>
            </div>

            <div
              className='df-mobile-event-drawer-expander'
              data-kind='calendar'
              data-expanded={String(expandedPicker === 'end-date')}
            >
              <div className='df-mobile-event-drawer-expander-content'>
                <MiniCalendar
                  currentDate={endDate}
                  visibleMonth={endVisibleMonth}
                  onDateSelect={d => handleDateChange('end', d)}
                  onMonthChange={offset => handleMonthChange('end', offset)}
                  showHeader
                  events={app.getEvents()}
                  calendarRegistry={app.getCalendarRegistry()}
                  timeZone={app.timeZone}
                />
              </div>
            </div>
            <div
              className='df-mobile-event-drawer-expander'
              data-kind='time'
              data-expanded={String(expandedPicker === 'end-time')}
            >
              <div className='df-mobile-event-drawer-expander-content'>
                <TimePickerWheel
                  date={endDate}
                  onChange={handleEndTimeChange}
                  timeFormat={timeFormat}
                />
              </div>
            </div>
          </div>

          {shouldShowNotes && (
            <div className='df-mobile-event-drawer-section df-mobile-event-drawer-section-framed'>
              <textarea
                placeholder={t('notesPlaceholder')}
                value={notes}
                onChange={(
                  e: JSX.TargetedEvent<HTMLTextAreaElement, globalThis.Event>
                ) => isEditable && setNotes(e.currentTarget.value)}
                readOnly={!isEditable}
                className='df-mobile-event-drawer-notes'
              />
            </div>
          )}

          {isEditable && isEditing && onEventDelete && draftEvent && (
            <div className='df-mobile-event-drawer-section df-mobile-event-drawer-section-danger'>
              <button
                type='button'
                onClick={() => onEventDelete(draftEvent.id)}
                className='df-mobile-event-drawer-delete-button'
              >
                {t('delete')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
