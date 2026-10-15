import {
  CalendarType,
  useLocale,
  Check,
  ChevronsUpDown,
  LoadingButton,
  useDialogFocus,
} from '@dayflow/core';
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';

import { useListbox } from './useListbox';

interface ImportCalendarDialogProps {
  calendars: CalendarType[];
  filename: string;
  groups?: string[];
  onConfirm: (targetCalendarId: string) => void | Promise<void>;
  onCancel: () => void;
}

export const NEW_CALENDAR_ID = 'new-calendar';

export const ImportCalendarDialog = ({
  calendars,
  filename,
  groups,
  onConfirm,
  onCancel,
}: ImportCalendarDialogProps) => {
  const { t } = useLocale();
  const titleId = useId();
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>(
    calendars[0]?.id || NEW_CALENDAR_ID
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCalendar = calendars.find(c => c.id === selectedCalendarId);
  const isNewSelected = selectedCalendarId === NEW_CALENDAR_ID;

  const { ungroupedCalendars, groupedCalendars } = useMemo(() => {
    const hasAnyGroup =
      calendars.some(c => !!c.source) || (groups && groups.length > 0);
    if (!hasAnyGroup) {
      return {
        ungroupedCalendars: calendars,
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

    calendars.forEach(calendar => {
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
  }, [calendars, groups]);

  // Option ids in the order they're rendered, so arrow keys follow the list.
  const optionIds = useMemo(
    () => [
      ...ungroupedCalendars.map(c => c.id),
      ...groupedCalendars.flatMap(([, groupCals]) => groupCals.map(c => c.id)),
      NEW_CALENDAR_ID,
    ],
    [ungroupedCalendars, groupedCalendars]
  );

  const { triggerRef, triggerProps, listboxProps, getOptionProps, idPrefix } =
    useListbox({
      count: optionIds.length,
      selectedIndex: optionIds.indexOf(selectedCalendarId),
      isOpen,
      setIsOpen,
      onSelect: index => {
        setSelectedCalendarId(optionIds[index]);
        setIsOpen(false);
      },
      disabled: isLoading,
    });

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleConfirm = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onConfirm(selectedCalendarId);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCalendarItem = (calendar: CalendarType) => (
    <div
      key={calendar.id}
      {...getOptionProps(optionIds.indexOf(calendar.id))}
      className='df-sidebar-dropdown-item'
      data-selected={selectedCalendarId === calendar.id ? 'true' : undefined}
    >
      <div
        className='df-sidebar-swatch'
        style={{ backgroundColor: calendar.colors.lineColor }}
        aria-hidden='true'
      />
      <span className='df-sidebar-dropdown-label'>
        {calendar.name || calendar.id}
      </span>
      {selectedCalendarId === calendar.id && (
        <Check className='df-sidebar-dropdown-check' />
      )}
    </div>
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  // Escape closes the calendar dropdown first, then the dialog.
  useDialogFocus(dialogRef, {
    onClose: isOpen ? () => setIsOpen(false) : isLoading ? undefined : onCancel,
  });

  const renderDropdown = () => {
    if (!isOpen) return null;

    return (
      <div
        ref={dropdownRef}
        className='df-sidebar-dropdown'
        style={{ overscrollBehavior: 'none' }}
      >
        <div {...listboxProps} aria-label={t('calendar')}>
          {ungroupedCalendars.map(renderCalendarItem)}
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
                {groupCals.map(renderCalendarItem)}
              </div>
            );
          })}
          <div className='df-sidebar-dropdown-divider' role='presentation' />
          <div
            {...getOptionProps(optionIds.length - 1)}
            className='df-sidebar-dropdown-item'
            data-selected={isNewSelected ? 'true' : undefined}
          >
            <span className='df-sidebar-dropdown-label'>
              {t('newCalendar') || 'New Calendar'}: {filename}
            </span>
            {isNewSelected && <Check className='df-sidebar-dropdown-check' />}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='df-sidebar-overlay'>
      <div
        ref={dialogRef}
        className='df-sidebar-dialog'
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className='df-sidebar-dialog-title'>
          {t('addSchedule') || 'Add Schedule'}
        </h2>
        <p className='df-sidebar-dialog-text'>
          {t('importCalendarMessage') ||
            'This calendar contains new events. Please select a target calendar.'}
        </p>

        <div className='df-sidebar-field'>
          <button
            {...triggerProps}
            type='button'
            disabled={isLoading}
            className='df-sidebar-select-trigger'
          >
            {!isNewSelected && selectedCalendar && (
              <div
                className='df-sidebar-swatch'
                style={{ backgroundColor: selectedCalendar.colors.lineColor }}
                aria-hidden='true'
              />
            )}
            <span className='df-sidebar-select-value'>
              {isNewSelected
                ? `${t('newCalendar')}: ${filename}`
                : selectedCalendar?.name || selectedCalendar?.id}
            </span>
            <ChevronsUpDown className='df-sidebar-select-icon' />
          </button>
          {renderDropdown()}
        </div>

        <div className='df-sidebar-dialog-actions'>
          <button
            type='button'
            onClick={onCancel}
            disabled={isLoading}
            className='df-sidebar-button df-sidebar-button-secondary'
          >
            {t('cancel') || 'Cancel'}
          </button>
          <LoadingButton
            type='button'
            onClick={handleConfirm}
            loading={isLoading}
            className='df-sidebar-button df-sidebar-button-primary'
          >
            {t('ok') || 'OK'}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
};
