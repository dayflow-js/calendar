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
import { formatTime, isEventEqual } from '@/utils';
import { temporalToDate, dateToZonedDateTime } from '@/utils/temporal';

import { Switch } from './components/Switch';
import { TimePickerWheel } from './components/TimePickerWheel';

export const MobileEventDrawer = ({
  isOpen,
  onClose,
  onSave,
  onEventDelete,
  draftEvent,
  app,
}: MobileEventProps) => {
  const { locale, t } = useLocale();
  const readOnlyConfig = app.getReadOnlyConfig();
  const isEditable = !app.state.readOnly;
  const isViewable = readOnlyConfig.viewable !== false;

  const [title, setTitle] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [notes, setNotes] = useState('');

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

    let finalStart = new Date(startDate);
    let finalEnd = new Date(endDate);

    if (isAllDay) {
      finalStart.setHours(0, 0, 0, 0);
      finalEnd.setHours(0, 0, 0, 0);
    }

    const currentEvent: CalendarEvent = {
      ...draftEvent,
      title,
      calendarId,
      allDay: isAllDay,
      description: notes,
      start: dateToZonedDateTime(finalStart),
      end: dateToZonedDateTime(finalEnd),
    };

    return !isEventEqual(draftEvent, currentEvent);
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

    let finalStart = new Date(startDate);
    let finalEnd = new Date(endDate);

    if (isAllDay) {
      finalStart.setHours(0, 0, 0, 0);
      finalEnd.setHours(0, 0, 0, 0);
    }

    const updated = {
      ...draftEvent,
      title,
      calendarId,
      allDay: isAllDay,
      start: dateToZonedDateTime(finalStart),
      end: dateToZonedDateTime(finalEnd),
    };
    onSave(updated as CalendarEvent);
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
    <div className='fixed inset-0 z-10000 flex items-end pointer-events-none'>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 pointer-events-auto transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        style={{ touchAction: 'none' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`relative w-full bg-gray-100 dark:bg-gray-800 rounded-t-2xl shadow-xl h-[85vh] flex flex-col pointer-events-auto overflow-hidden ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Actions */}
        <div className='flex justify-between items-center p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700'>
          <button
            type='button'
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 px-2 py-1'
          >
            {t('cancel')}
          </button>
          <span className='font-semibold text-lg'>
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
              className={`font-bold px-2 py-1 transition-colors ${
                hasChanges
                  ? 'text-primary'
                  : 'text-gray-400 cursor-not-allowed opacity-50'
              }`}
            >
              {isEditing ? t('done') : t('create')}
            </button>
          )}
          {!isEditable && <span className='w-12' />}
        </div>

        <div className='flex-1 overflow-y-auto p-4 space-y-4'>
          {/* Title */}
          <div className='bg-white dark:bg-gray-900 rounded-lg px-4 py-3'>
            <input
              type='text'
              placeholder={t('titlePlaceholder')}
              value={title}
              onChange={(
                e: JSX.TargetedEvent<HTMLInputElement, globalThis.Event>
              ) => isEditable && setTitle(e.currentTarget.value)}
              readOnly={!isEditable}
              className='w-full bg-transparent text-xl font-medium placeholder-gray-400 focus:outline-none'
              autoFocus={isEditable}
            />
          </div>

          {/* Calendar */}
          {calendars.length > 0 && (
            <div className='bg-white dark:bg-gray-900 rounded-lg px-4 py-3 flex justify-between items-center relative'>
              <span className='text-gray-700 dark:text-gray-300'>
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
          )}

          {/* All-day */}
          <div className='bg-white dark:bg-gray-900 rounded-lg px-4 py-3 flex justify-between items-center'>
            <span className='text-gray-700 dark:text-gray-300'>
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

          {/* Starts */}
          <div className='bg-white dark:bg-gray-900 rounded-lg overflow-hidden'>
            <div className='flex justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0'>
              <span className='text-gray-700 dark:text-gray-300'>
                {t('starts')}
              </span>
              <div className='flex space-x-2'>
                <button
                  type='button'
                  className={`px-3 py-1 rounded-md transition-colors ${expandedPicker === 'start-date' ? 'bg-gray-200 dark:bg-gray-700 text-primary dark:text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                  onClick={() => isEditable && toggleExpand('start-date')}
                  disabled={!isEditable}
                >
                  {formatDate(startDate)}
                </button>
                {!isAllDay && (
                  <button
                    type='button'
                    className={`px-3 py-1 rounded-md transition-colors ${expandedPicker === 'start-time' ? 'bg-gray-200 dark:bg-gray-700 text-primary dark:text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                    onClick={() => isEditable && toggleExpand('start-time')}
                    disabled={!isEditable}
                  >
                    {formatTime(
                      startDate.getHours() + startDate.getMinutes() / 60
                    )}
                  </button>
                )}
              </div>
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedPicker === 'start-date' ? 'max-h-100' : 'max-h-0'}`}
            >
              <div className=''>
                <MiniCalendar
                  currentDate={startDate}
                  visibleMonth={startVisibleMonth}
                  onDateSelect={d => handleDateChange('start', d)}
                  onMonthChange={offset => handleMonthChange('start', offset)}
                  showHeader
                />
              </div>
            </div>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedPicker === 'start-time' ? 'max-h-75' : 'max-h-0'}`}
            >
              <div className=''>
                <TimePickerWheel
                  date={startDate}
                  onChange={handleStartTimeChange}
                />
              </div>
            </div>
          </div>

          {/* Ends */}
          <div className='bg-white dark:bg-gray-900 rounded-lg overflow-hidden'>
            <div className='flex justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0'>
              <span className='text-gray-700 dark:text-gray-300'>
                {t('ends')}
              </span>
              <div className='flex space-x-2'>
                <button
                  type='button'
                  className={`px-3 py-1 rounded-md transition-colors ${expandedPicker === 'end-date' ? 'bg-gray-200 dark:bg-gray-700 text-primary dark:text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                  onClick={() => isEditable && toggleExpand('end-date')}
                  disabled={!isEditable}
                >
                  {formatDate(endDate)}
                </button>
                {!isAllDay && (
                  <button
                    type='button'
                    className={`px-3 py-1 rounded-md transition-colors ${expandedPicker === 'end-time' ? 'bg-gray-200 dark:bg-gray-700 text-primary dark:text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                    onClick={() => isEditable && toggleExpand('end-time')}
                    disabled={!isEditable}
                  >
                    {formatTime(endDate.getHours() + endDate.getMinutes() / 60)}
                  </button>
                )}
              </div>
            </div>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedPicker === 'end-date' ? 'max-h-100' : 'max-h-0'}`}
            >
              <div className=''>
                <MiniCalendar
                  currentDate={endDate}
                  visibleMonth={endVisibleMonth}
                  onDateSelect={d => handleDateChange('end', d)}
                  onMonthChange={offset => handleMonthChange('end', offset)}
                  showHeader
                />
              </div>
            </div>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedPicker === 'end-time' ? 'max-h-75' : 'max-h-0'}`}
            >
              <div className=''>
                <TimePickerWheel
                  date={endDate}
                  onChange={handleEndTimeChange}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className='bg-white dark:bg-gray-900 rounded-lg px-4 py-3'>
            <textarea
              placeholder={t('notesPlaceholder')}
              value={notes}
              onChange={(
                e: JSX.TargetedEvent<HTMLTextAreaElement, globalThis.Event>
              ) => isEditable && setNotes(e.currentTarget.value)}
              readOnly={!isEditable}
              className='w-full bg-transparent text-base placeholder-gray-400 focus:outline-none min-h-20'
            />
          </div>

          {/* Delete button — only for existing events that can be edited */}
          {isEditable && isEditing && onEventDelete && draftEvent && (
            <button
              type='button'
              onClick={() => onEventDelete(draftEvent.id)}
              className='w-full bg-white dark:bg-gray-900 rounded-lg px-4 py-3 text-red-500 font-medium text-left'
            >
              {t('delete')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
