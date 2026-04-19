import {
  createPortal,
  CalendarType,
  useLocale,
  Check,
  ChevronsUpDown,
  LoadingButton,
} from '@dayflow/core';
import { useState, useRef, useEffect } from 'preact/hooks';

interface ImportCalendarDialogProps {
  calendars: CalendarType[];
  filename: string;
  onConfirm: (targetCalendarId: string) => void | Promise<void>;
  onCancel: () => void;
}

export const NEW_CALENDAR_ID = 'new-calendar';

export const ImportCalendarDialog = ({
  calendars,
  filename,
  onConfirm,
  onCancel,
}: ImportCalendarDialogProps) => {
  const { t } = useLocale();
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>(
    calendars[0]?.id || NEW_CALENDAR_ID
  );
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
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
  }, []);

  const selectedCalendar = calendars.find(c => c.id === selectedCalendarId);
  const isNewSelected = selectedCalendarId === NEW_CALENDAR_ID;

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

  const renderDropdown = () => {
    if (!shouldRender) return null;

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return createPortal(
      <div
        ref={dropdownRef}
        className='df-sidebar-dropdown'
        style={{
          top: rect.bottom,
          left: rect.left,
          width: rect.width,
          overscrollBehavior: 'none',
        }}
      >
        <div>
          {calendars.map(calendar => (
            <div
              key={calendar.id}
              className='df-sidebar-dropdown-item'
              data-selected={
                selectedCalendarId === calendar.id ? 'true' : undefined
              }
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
          ))}
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
      </div>,
      document.body
    );
  };

  return (
    <div className='df-sidebar-overlay'>
      <div className='df-sidebar-dialog'>
        <h2 className='df-sidebar-dialog-title'>
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
