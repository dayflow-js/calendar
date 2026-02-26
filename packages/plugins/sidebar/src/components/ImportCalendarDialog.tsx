import {
  createPortal,
  CalendarType,
  cancelButton,
  useLocale,
  Check,
  ChevronsUpDown,
} from '@dayflow/core';
import { useState, useRef, useEffect } from 'preact/hooks';

interface ImportCalendarDialogProps {
  calendars: CalendarType[];
  filename: string;
  onConfirm: (targetCalendarId: string) => void;
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

  const renderDropdown = () => {
    if (!shouldRender) return null;

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return createPortal(
      <div
        ref={dropdownRef}
        className={`fixed z-110 mt-1 max-h-60 origin-top overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg transition-all duration-200 dark:border-slate-700 dark:bg-slate-800 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        style={{
          top: rect.bottom,
          left: rect.left,
          width: rect.width,
        }}
      >
        <div className='py-1'>
          {calendars.map(calendar => (
            <div
              key={calendar.id}
              className={`flex cursor-pointer items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 ${selectedCalendarId === calendar.id ? 'bg-primary/10' : ''}`}
              onClick={() => handleSelect(calendar.id)}
            >
              <div
                className='mr-3 h-3 w-3 shrink-0 rounded-sm'
                style={{ backgroundColor: calendar.colors.lineColor }}
              />
              <span
                className={`flex-1 truncate text-sm ${selectedCalendarId === calendar.id ? 'font-medium text-primary' : 'text-gray-700 dark:text-gray-200'}`}
              >
                {calendar.name || calendar.id}
              </span>
              {selectedCalendarId === calendar.id && (
                <Check className='ml-2 h-4 w-4 shrink-0 text-primary' />
              )}
            </div>
          ))}
          <div className='my-1 border-t border-gray-100 dark:border-slate-700' />
          <div
            className={`flex cursor-pointer items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 ${isNewSelected ? 'bg-primary/10' : ''}`}
            onClick={() => handleSelect(NEW_CALENDAR_ID)}
          >
            <span
              className={`flex-1 truncate text-sm ${isNewSelected ? 'font-medium text-primary' : 'pl-6 text-gray-700 dark:text-gray-200'}`}
            >
              {t('newCalendar') || 'New Calendar'}: {filename}
            </span>
            {isNewSelected && (
              <Check className='ml-2 h-4 w-4 shrink-0 text-primary' />
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className='fixed inset-0 z-100 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900'>
        <h2 className='mb-4 text-lg font-semibold text-gray-900 dark:text-white'>
          {t('addSchedule') || 'Add Schedule'}
        </h2>
        <p className='mb-4 text-sm text-gray-600 dark:text-gray-300'>
          {t('importCalendarMessage') ||
            'This calendar contains new events. Please select a target calendar.'}
        </p>

        <div className='relative'>
          <button
            ref={triggerRef}
            type='button'
            className='flex w-full items-center rounded-md border border-gray-300 px-3 py-2 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'
            onClick={() => setIsOpen(!isOpen)}
          >
            {!isNewSelected && selectedCalendar && (
              <div
                className='mr-3 h-3 w-3 shrink-0 rounded-sm'
                style={{ backgroundColor: selectedCalendar.colors.lineColor }}
              />
            )}
            <span
              className={`flex-1 truncate text-left text-sm font-medium text-gray-700 dark:text-gray-200 ${isNewSelected ? 'pl-0' : ''}`}
            >
              {isNewSelected
                ? `${t('newCalendar')}: ${filename}`
                : selectedCalendar?.name || selectedCalendar?.id}
            </span>
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 text-gray-400' />
          </button>
          {renderDropdown()}
        </div>

        <div className='mt-8 flex justify-end gap-3'>
          <button type='button' onClick={onCancel} className={cancelButton}>
            {t('cancel') || 'Cancel'}
          </button>
          <button
            type='button'
            onClick={() => onConfirm(selectedCalendarId)}
            className='rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90'
          >
            {t('ok') || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};
