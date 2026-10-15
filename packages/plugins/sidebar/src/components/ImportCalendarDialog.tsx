import {
  CalendarType,
  useLocale,
  Check,
  ChevronsUpDown,
  LoadingButton,
} from '@dayflow/core';
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';

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
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const selectedCalendar = calendars.find(c => c.id === selectedCalendarId);
  const isNewSelected = selectedCalendarId === NEW_CALENDAR_ID;

  const { ungroupedCalendars, groupedCalendars, hasGroups } = useMemo(() => {
    const hasAnyGroup =
      calendars.some(c => !!c.source) || (groups && groups.length > 0);
    if (!hasAnyGroup) {
      return {
        ungroupedCalendars: calendars,
        groupedCalendars: [],
        hasGroups: false,
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
      hasGroups: true,
    };
  }, [calendars, groups]);

  const handleSelect = (id: string) => {
    setSelectedCalendarId(id);
    setIsOpen(false);
  };

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
      className='df-sidebar-dropdown-item'
      data-selected={selectedCalendarId === calendar.id ? 'true' : undefined}
      onClick={() => handleSelect(calendar.id)}
    >
      <div
        className='df-sidebar-swatch'
        style={{ backgroundColor: calendar.colors.lineColor }}
      />
      <span className='df-sidebar-dropdown-label'>
        {calendar.name || calendar.id}
      </span>
      {selectedCalendarId === calendar.id && (
        <Check className='df-sidebar-dropdown-check' />
      )}
    </div>
  );

  const renderDropdown = () => {
    if (!isOpen) return null;

    return (
      <div
        ref={dropdownRef}
        className='df-sidebar-dropdown'
        style={{ overscrollBehavior: 'none' }}
      >
        <div>
          {hasGroups ? (
            <>
              {ungroupedCalendars.map(calendar => renderCalendarItem(calendar))}
              {groupedCalendars.map(([groupName, groupCals]) => (
                <div key={groupName} className='df-sidebar-dropdown-group'>
                  <div className='df-sidebar-dropdown-group-label'>
                    {groupName}
                  </div>
                  {groupCals.map(calendar => renderCalendarItem(calendar))}
                </div>
              ))}
            </>
          ) : (
            calendars.map(calendar => renderCalendarItem(calendar))
          )}
          <div className='df-sidebar-dropdown-divider' />
          <div
            className='df-sidebar-dropdown-item'
            data-selected={isNewSelected ? 'true' : undefined}
            onClick={() => handleSelect(NEW_CALENDAR_ID)}
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
            ref={triggerRef}
            type='button'
            disabled={isLoading}
            className='df-sidebar-select-trigger'
            onClick={() => setIsOpen(!isOpen)}
          >
            {!isNewSelected && selectedCalendar && (
              <div
                className='df-sidebar-swatch'
                style={{ backgroundColor: selectedCalendar.colors.lineColor }}
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
