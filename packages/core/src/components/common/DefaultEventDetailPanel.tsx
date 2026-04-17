import { RangePicker } from '@dayflow/ui-range-picker';
import { JSX } from 'preact';
import { createPortal } from 'preact/compat';
import {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import { getCalendarContentElement } from '@/components/calendarEvent/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { getDefaultCalendarRegistry } from '@/core/calendarRegistry';
import { useLocale } from '@/locale';
import { eventDetailPanel } from '@/styles/classNames';
import {
  Event,
  EventDetailPanelProps,
  CalendarType,
  ICalendarApp,
} from '@/types';
import { isEventDeepEqual } from '@/utils/eventUtils';
import { logger } from '@/utils/logger';
import { isPlainDate } from '@/utils/temporal';
import { resolveAppliedTheme } from '@/utils/themeUtils';
import { restoreVisualEventToCanonical } from '@/utils/timeUtils';

import { CalendarOption, CalendarPicker } from './CalendarPicker';
import { LoadingButton } from './LoadingButton';

interface DefaultEventDetailPanelProps extends EventDetailPanelProps {
  app?: ICalendarApp;
}

/**
 * Default event detail panel component
 */
const DefaultEventDetailPanel = ({
  event,
  position,
  panelRef,
  isAllDay: _isAllDay,
  eventVisibility,
  calendarRef,
  selectedEventElementRef,
  onEventUpdate,
  onEventDelete,
  onClose: _onClose,
  app,
}: DefaultEventDetailPanelProps) => {
  const { effectiveTheme } = useTheme();
  const appliedTheme = resolveAppliedTheme(effectiveTheme);
  const { t } = useLocale();

  const [draftEvent, setDraftEvent] = useState(event);
  const [isLoading, setIsLoading] = useState(false);
  const committedEventRef = useRef(event);
  const draftEventRef = useRef(event);
  const skipCommitRef = useRef(false);

  const commitDraftChanges = useCallback(() => {
    if (skipCommitRef.current) return;

    const committedEvent = committedEventRef.current;
    const latestDraftEvent = draftEventRef.current;

    if (isEventDeepEqual(committedEvent, latestDraftEvent)) return;

    const canonicalDraftEvent = restoreVisualEventToCanonical(
      committedEvent,
      latestDraftEvent,
      app?.timeZone
    );

    committedEventRef.current = canonicalDraftEvent;
    draftEventRef.current = canonicalDraftEvent;
    const updateResult = onEventUpdate(canonicalDraftEvent);
    if (updateResult) {
      Promise.resolve(updateResult).catch(error => {
        logger.error(
          'Failed to commit deferred event detail panel update',
          error
        );
      });
    }
  }, [app?.timeZone, onEventUpdate]);

  const applyDraftEventUpdate = useCallback(
    (nextDraftEvent: Event) => {
      if (isEventDeepEqual(draftEventRef.current, nextDraftEvent)) return;

      draftEventRef.current = nextDraftEvent;
      setDraftEvent(nextDraftEvent);

      if (app) {
        const updateResult = app.updateEvent(
          nextDraftEvent.id,
          nextDraftEvent,
          true
        );
        if (updateResult) {
          Promise.resolve(updateResult).catch(error => {
            logger.error(
              'Failed to apply pending event detail panel update',
              error
            );
          });
        }
      }
    },
    [app]
  );

  useEffect(() => {
    const sameEvent = committedEventRef.current.id === event.id;

    if (!sameEvent) {
      commitDraftChanges();
      skipCommitRef.current = false;
      committedEventRef.current = event;
      draftEventRef.current = event;
      setDraftEvent(event);
      return;
    }

    if (isEventDeepEqual(committedEventRef.current, draftEventRef.current)) {
      committedEventRef.current = event;
      draftEventRef.current = event;
      setDraftEvent(event);
    }
  }, [event, commitDraftChanges]);

  useEffect(
    () => () => {
      commitDraftChanges();
    },
    [commitDraftChanges]
  );

  const eventTimeZone = useMemo(
    () => app?.timeZone ?? Temporal.Now.timeZoneId(),
    [app]
  );

  // Get visible calendar type options
  const colorOptions: CalendarOption[] = useMemo(() => {
    const registry = app
      ? app.getCalendarRegistry()
      : getDefaultCalendarRegistry();
    return registry.getVisible().map((cal: CalendarType) => ({
      label: cal.name,
      value: cal.id,
    }));
  }, [app, app?.getCalendars()]); // Depend on app.getCalendars() to update when calendars change

  // Check if dark mode is active (either via theme context or DOM class)
  const isDark =
    appliedTheme === 'dark' ||
    (typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'));
  const isEditable = app?.canMutateFromUI(event.id) ?? false;
  const readOnlyConfig = app?.getReadOnlyConfig(event.id) as {
    draggable: boolean;
    viewable: boolean;
  };
  const isViewable = readOnlyConfig?.viewable !== false;
  const isDraftAllDay = !!draftEvent.allDay;

  // Check if it's a subscribed calendar
  const isSubscribed = useMemo(() => {
    if (!event.calendarId) return false;
    const calendar = app?.getCalendarRegistry().get(event.calendarId);
    return !!calendar?.subscription;
  }, [app, event.calendarId]);

  // If subscribed calendar and no notes, hide notes field
  const shouldShowNotes =
    !isSubscribed || (draftEvent.description || '').trim() !== '';

  if (!isViewable) return null;

  const arrowBgColor = isDark ? '#1f2937' : 'white';
  const arrowBorderColor = isDark ? 'rgb(55, 65, 81)' : 'rgb(229, 231, 235)';

  const convertToAllDay = () => {
    if (isLoading) return;
    const plainDate = isPlainDate(draftEvent.start)
      ? draftEvent.start
      : draftEvent.start.toPlainDate();
    const plainEndDate = isPlainDate(draftEvent.end)
      ? draftEvent.end
      : draftEvent.end.toPlainDate();

    applyDraftEventUpdate({
      ...draftEvent,
      allDay: true,
      start: plainDate,
      end: plainEndDate,
    });
  };

  const convertToRegular = () => {
    if (isLoading) return;
    const plainDate = isPlainDate(draftEvent.start)
      ? draftEvent.start
      : draftEvent.start.toPlainDate();
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

    applyDraftEventUpdate({
      ...draftEvent,
      allDay: false,
      start,
      end,
    });
  };

  const handleAllDayRangeChange = (
    nextRange: [Temporal.ZonedDateTime, Temporal.ZonedDateTime]
  ) => {
    if (isLoading) return;
    const [start, end] = nextRange;

    applyDraftEventUpdate({
      ...draftEvent,
      start: start.toPlainDate(),
      end: end.toPlainDate(),
    });
  };

  const handleEventDelete = async () => {
    if (isLoading) return;
    skipCommitRef.current = true;
    setIsLoading(true);
    try {
      await onEventDelete(draftEvent.id);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate arrow style
  const calculateArrowStyle = (): JSX.CSSProperties => {
    let arrowStyle: JSX.CSSProperties = {};

    if (eventVisibility === 'sticky-top') {
      const calendarContent = getCalendarContentElement(calendarRef);
      if (calendarContent) {
        const contentRect = calendarContent.getBoundingClientRect();
        const stickyEventCenterY = contentRect.top + 3;
        const arrowRelativeY = stickyEventCenterY - position.top;

        arrowStyle = {
          position: 'absolute',
          width: '12px',
          height: '12px',
          backgroundColor: arrowBgColor,
          transform: 'rotate(45deg)',
          transformOrigin: 'center',
          top: `${arrowRelativeY - 6}px`,
          borderRight: `${position.isSunday ? `1px solid ${arrowBorderColor}` : 'none'}`,
          borderTop: `${position.isSunday ? `1px solid ${arrowBorderColor}` : 'none'}`,
          borderLeft: `${position.isSunday ? 'none' : `1px solid ${arrowBorderColor}`}`,
          borderBottom: `${position.isSunday ? 'none' : `1px solid ${arrowBorderColor}`}`,
          ...(position.isSunday ? { right: '-6px' } : { left: '-6px' }),
        };
      }
    } else if (eventVisibility === 'sticky-bottom') {
      const panelElement = panelRef.current;
      let arrowTop = 200;

      if (panelElement) {
        const panelRect = panelElement.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(panelElement);
        const paddingBottom =
          Number.parseInt(computedStyle.paddingBottom, 10) || 0;
        const borderBottom =
          Number.parseInt(computedStyle.borderBottomWidth, 10) || 0;

        arrowTop = panelRect.height - paddingBottom - borderBottom - 6 + 11;
      }

      arrowStyle = {
        position: 'absolute',
        width: '12px',
        height: '12px',
        backgroundColor: arrowBgColor,
        transform: 'rotate(45deg)',
        transformOrigin: 'center',
        top: `${arrowTop}px`,
        left: position.isSunday ? undefined : '-6px',
        right: position.isSunday ? '-6px' : undefined,
        borderRight: `${position.isSunday ? `1px solid ${arrowBorderColor}` : 'none'}`,
        borderTop: `${position.isSunday ? `1px solid ${arrowBorderColor}` : 'none'}`,
        borderLeft: `${position.isSunday ? 'none' : `1px solid ${arrowBorderColor}`}`,
        borderBottom: `${position.isSunday ? 'none' : `1px solid ${arrowBorderColor}`}`,
      };
    } else {
      if (position && selectedEventElementRef.current && calendarRef.current) {
        const eventRect =
          selectedEventElementRef.current.getBoundingClientRect();
        const calendarContent = getCalendarContentElement(calendarRef);

        if (calendarContent) {
          const viewportRect = calendarContent.getBoundingClientRect();

          const visibleTop = Math.max(eventRect.top, viewportRect.top);
          const visibleBottom = Math.min(eventRect.bottom, viewportRect.bottom);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);

          let targetY;
          if (visibleHeight === eventRect.height) {
            targetY = eventRect.top + eventRect.height / 2;
          } else if (visibleHeight > 0) {
            targetY = visibleTop + visibleHeight / 2;
          } else {
            targetY = eventRect.top + eventRect.height / 2;
          }

          const arrowRelativeY = targetY - position.top;

          const panelElement = panelRef.current;
          let maxArrowY = 240 - 12;

          if (panelElement) {
            const panelRect = panelElement.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(panelElement);
            const paddingBottom =
              Number.parseInt(computedStyle.paddingBottom, 10) || 0;
            const borderBottom =
              Number.parseInt(computedStyle.borderBottomWidth, 10) || 0;

            maxArrowY = panelRect.height - paddingBottom - borderBottom + 11;
          }

          const minArrowY = 12;
          const finalArrowY = Math.max(
            minArrowY,
            Math.min(maxArrowY, arrowRelativeY)
          );

          arrowStyle = {
            position: 'absolute',
            width: '12px',
            height: '12px',
            backgroundColor: arrowBgColor,
            transform: 'rotate(45deg)',
            transformOrigin: 'center',
            top: `${finalArrowY - 6}px`,
            borderRight: `${position.isSunday ? `1px solid ${arrowBorderColor}` : 'none'}`,
            borderTop: `${position.isSunday ? `1px solid ${arrowBorderColor}` : 'none'}`,
            borderLeft: `${position.isSunday ? 'none' : `1px solid ${arrowBorderColor}`}`,
            borderBottom: `${position.isSunday ? 'none' : `1px solid ${arrowBorderColor}`}`,
            ...(position.isSunday ? { right: '-6px' } : { left: '-6px' }),
          };
        }
      }
    }

    return arrowStyle;
  };

  const arrowStyle = calculateArrowStyle();

  const panelContent = (
    <div
      ref={panelRef}
      className={`${eventDetailPanel} df-event-panel__content`}
      data-event-detail-panel='true'
      data-event-id={event.id}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
    >
      <div style={arrowStyle}></div>
      <span className='df-form-label'>{t('eventTitle')}</span>
      <div className='df-form-row' style={{ marginBottom: '0.75rem' }}>
        <div className='df-form-field'>
          <input
            id={`event-title-${draftEvent.id}`}
            name='title'
            type='text'
            value={draftEvent.title}
            readOnly={!isEditable || isLoading}
            disabled={!isEditable || isLoading}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              applyDraftEventUpdate({
                ...draftEvent,
                title: (e.target as HTMLInputElement).value,
              })
            }
            onInput={(e: React.FormEvent<HTMLInputElement>) =>
              applyDraftEventUpdate({
                ...draftEvent,
                title: (e.target as HTMLInputElement).value,
              })
            }
            className='df-form-input'
          />
        </div>
        {isEditable && (
          <CalendarPicker
            options={colorOptions}
            value={draftEvent.calendarId || 'blue'}
            disabled={isLoading}
            onChange={value => {
              applyDraftEventUpdate({
                ...draftEvent,
                calendarId: value,
              });
            }}
            registry={app?.getCalendarRegistry()}
          />
        )}
      </div>

      {isDraftAllDay ? (
        <div
          className='df-event-dialog__time-row'
          style={{ marginBottom: '0.75rem' }}
        >
          <div className='df-form-label'>{t('dateRange')}</div>
          <RangePicker
            value={[draftEvent.start, draftEvent.end]}
            format='YYYY-MM-DD'
            showTime={false}
            timeZone={eventTimeZone}
            matchTriggerWidth
            disabled={!isEditable || isLoading}
            onChange={handleAllDayRangeChange}
            locale={app?.state.locale}
          />
        </div>
      ) : (
        <div
          className='df-event-dialog__time-row'
          style={{ marginBottom: '0.75rem' }}
        >
          <div className='df-form-label'>{t('timeRange')}</div>
          <RangePicker
            value={[draftEvent.start, draftEvent.end]}
            timeZone={eventTimeZone}
            disabled={!isEditable || isLoading}
            onChange={(
              nextRange: [Temporal.ZonedDateTime, Temporal.ZonedDateTime]
            ) => {
              if (isLoading) return;
              const [start, end] = nextRange;
              applyDraftEventUpdate({ ...draftEvent, start, end });
            }}
            locale={app?.state.locale}
          />
        </div>
      )}

      {shouldShowNotes && (
        <div
          className='df-event-dialog__notes-row'
          style={{ marginBottom: '0.75rem' }}
        >
          <span className='df-form-label'>{t('note')}</span>
          <textarea
            id={`event-note-${draftEvent.id}`}
            name='note'
            value={draftEvent.description ?? ''}
            readOnly={!isEditable || isLoading}
            disabled={!isEditable || isLoading}
            onChange={e =>
              applyDraftEventUpdate({
                ...draftEvent,
                description: (e.target as HTMLTextAreaElement).value,
              })
            }
            onInput={e =>
              applyDraftEventUpdate({
                ...draftEvent,
                description: (e.target as HTMLTextAreaElement).value,
              })
            }
            rows={3}
            className='df-form-textarea'
            placeholder={t('addNotePlaceholder')}
          />
        </div>
      )}

      {isEditable && (
        <div className='df-form-actions'>
          {isDraftAllDay ? (
            <LoadingButton
              type='button'
              className='df-fill-primary df-hover-primary-solid df-btn-sm'
              onClick={convertToRegular}
              loading={isLoading}
            >
              {t('setAsTimed')}
            </LoadingButton>
          ) : (
            <LoadingButton
              type='button'
              className='df-fill-primary df-hover-primary-solid df-btn-sm'
              onClick={convertToAllDay}
              loading={isLoading}
            >
              {t('setAsAllDay')}
            </LoadingButton>
          )}

          <LoadingButton
            type='button'
            className='df-fill-destructive df-hover-destructive df-btn-sm'
            onClick={handleEventDelete}
            loading={isLoading}
          >
            {t('delete')}
          </LoadingButton>
        </div>
      )}
    </div>
  );

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const portalTarget = document.body;
  if (!portalTarget) return null;

  return createPortal(panelContent, portalTarget);
};

export default DefaultEventDetailPanel;
