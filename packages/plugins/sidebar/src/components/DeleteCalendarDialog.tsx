import {
  createPortal,
  CalendarType,
  useLocale,
  LoadingButton,
  useDialogFocus,
} from '@dayflow/core';
import { useId, useMemo, useRef, useState } from 'preact/hooks';

import { CalendarChip } from './CalendarChip';
import { useListbox } from './useListbox';

const CAL_SENTINEL = '\u0001C\u0001';

function renderWithChip(template: string, name: string, color: string) {
  return template
    .split(CAL_SENTINEL)
    .flatMap((part, i) =>
      i === 0
        ? [part]
        : [<CalendarChip key={i} name={name} color={color} />, part]
    );
}

interface DeleteCalendarDialogProps {
  calendarId: string;
  calendarName: string;
  calendars: CalendarType[];
  groups?: string[];
  step: 'initial' | 'confirm_delete';
  onStepChange: (step: 'initial' | 'confirm_delete') => void;
  onConfirmDelete: () => void | Promise<void>;
  onCancel: () => void;
  onMergeSelect: (targetId: string) => void | Promise<void>;
}

export const DeleteCalendarDialog = ({
  calendarId,
  calendarName,
  calendars,
  groups,
  step,
  onStepChange,
  onConfirmDelete,
  onCancel,
  onMergeSelect,
}: DeleteCalendarDialogProps) => {
  const [showMergeDropdown, setShowMergeDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLocale();
  const titleId = useId();
  const calendarColor =
    calendars.find(c => c.id === calendarId)?.colors.lineColor ?? '#6b7280';

  const availableCalendars = useMemo(
    () => calendars.filter(c => c.id !== calendarId),
    [calendars, calendarId]
  );

  const { ungroupedCalendars, groupedCalendars } = useMemo(() => {
    const hasAnyGroup =
      availableCalendars.some(c => !!c.source) || (groups && groups.length > 0);
    if (!hasAnyGroup) {
      return {
        ungroupedCalendars: availableCalendars,
        groupedCalendars: [],
      };
    }

    const ungrouped: CalendarType[] = [];
    const groupMap = new Map<string, CalendarType[]>();

    if (groups) {
      groups.forEach(groupName => {
        if (!groupMap.has(groupName)) groupMap.set(groupName, []);
      });
    }

    availableCalendars.forEach(calendar => {
      const source = calendar.source;
      if (source) {
        if (!groupMap.has(source)) groupMap.set(source, []);
        groupMap.get(source)!.push(calendar);
      } else {
        ungrouped.push(calendar);
      }
    });

    const grouped = Array.from(groupMap.entries()).filter(
      ([, cals]) => cals.length > 0
    );

    return {
      ungroupedCalendars: ungrouped,
      groupedCalendars: grouped,
    };
  }, [availableCalendars, groups]);

  const handleMergeSelect = async (id: string) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onMergeSelect(id);
      setShowMergeDropdown(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Options in the order they're rendered, so arrow keys follow the list.
  const mergeOptions = useMemo(
    () => [
      ...ungroupedCalendars,
      ...groupedCalendars.flatMap(([, groupCals]) => groupCals),
    ],
    [ungroupedCalendars, groupedCalendars]
  );

  const { triggerProps, listboxProps, getOptionProps, idPrefix } = useListbox({
    count: mergeOptions.length,
    selectedIndex: -1,
    isOpen: showMergeDropdown,
    setIsOpen: setShowMergeDropdown,
    onSelect: index => handleMergeSelect(mergeOptions[index].id),
    disabled: isLoading,
  });

  const renderMergeOption = (calendar: CalendarType) => (
    <div
      key={calendar.id}
      {...getOptionProps(mergeOptions.indexOf(calendar))}
      className='df-sidebar-dropdown-item'
    >
      <div
        className='df-sidebar-swatch'
        style={{ backgroundColor: calendar.colors.lineColor }}
        aria-hidden='true'
      />
      <span className='df-sidebar-dropdown-label'>
        {calendar.name || calendar.id}
      </span>
    </div>
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  // Escape closes the merge dropdown first, then the dialog.
  useDialogFocus(dialogRef, {
    onClose: showMergeDropdown
      ? () => setShowMergeDropdown(false)
      : isLoading
        ? undefined
        : onCancel,
  });

  const handleConfirmDelete = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onConfirmDelete();
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className='df-sidebar-overlay'>
      <div
        ref={dialogRef}
        className='df-sidebar-dialog'
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
      >
        {step === 'initial' ? (
          <>
            <h2 id={titleId} className='df-sidebar-dialog-title'>
              {t('deleteCalendar', { calendarName })}
            </h2>
            <p className='df-sidebar-dialog-text df-sidebar-dialog-line'>
              {renderWithChip(
                t('deleteCalendarMessage', { calendarName: CAL_SENTINEL }),
                calendarName,
                calendarColor
              )}
            </p>
            <div className='df-sidebar-dialog-split-actions'>
              <div className='df-sidebar-field'>
                <button
                  {...triggerProps}
                  type='button'
                  disabled={isLoading}
                  className='df-sidebar-button df-sidebar-button-secondary'
                >
                  {t('merge')}
                </button>
                {showMergeDropdown && (
                  <div
                    {...listboxProps}
                    className='df-sidebar-dropdown'
                    aria-label={t('merge')}
                  >
                    {ungroupedCalendars.map(renderMergeOption)}
                    {groupedCalendars.map(([groupName, groupCals], i) => {
                      const groupLabelId = `${idPrefix}-group-${i}`;
                      return (
                        <div
                          key={groupName}
                          role='group'
                          aria-labelledby={groupLabelId}
                          className='df-sidebar-dropdown-group'
                        >
                          <div
                            id={groupLabelId}
                            role='presentation'
                            className='df-sidebar-dropdown-group-label'
                          >
                            {groupName}
                          </div>
                          {groupCals.map(renderMergeOption)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className='df-sidebar-button-row'>
                <button
                  type='button'
                  onClick={onCancel}
                  disabled={isLoading}
                  className='df-sidebar-button df-sidebar-button-secondary'
                >
                  {t('cancel')}
                </button>
                <button
                  type='button'
                  onClick={() => onStepChange('confirm_delete')}
                  disabled={isLoading}
                  className='df-sidebar-button df-sidebar-button-destructive'
                >
                  {t('delete')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 id={titleId} className='df-sidebar-dialog-title'>
              {t('confirmDeleteTitle', { calendarName })}
            </h2>
            <p className='df-sidebar-dialog-text'>
              {t('confirmDeleteMessage')}
            </p>
            <div className='df-sidebar-dialog-actions'>
              <button
                type='button'
                onClick={onCancel}
                disabled={isLoading}
                className='df-sidebar-button df-sidebar-button-secondary'
              >
                {t('cancel')}
              </button>
              <LoadingButton
                type='button'
                onClick={handleConfirmDelete}
                loading={isLoading}
                className='df-sidebar-button df-sidebar-button-destructive'
              >
                {t('delete')}
              </LoadingButton>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
