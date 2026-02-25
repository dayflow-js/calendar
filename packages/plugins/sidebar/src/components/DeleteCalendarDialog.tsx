import {
  createPortal,
  CalendarType,
  cancelButton,
  useLocale,
} from '@dayflow/core';
import { useState } from 'preact/hooks';

interface DeleteCalendarDialogProps {
  calendarId: string;
  calendarName: string;
  calendars: CalendarType[];
  step: 'initial' | 'confirm_delete';
  onStepChange: (step: 'initial' | 'confirm_delete') => void;
  onConfirmDelete: () => void;
  onCancel: () => void;
  onMergeSelect: (targetId: string) => void;
}

export const DeleteCalendarDialog = ({
  calendarId,
  calendarName,
  calendars,
  step,
  onStepChange,
  onConfirmDelete,
  onCancel,
  onMergeSelect,
}: DeleteCalendarDialogProps) => {
  const [showMergeDropdown, setShowMergeDropdown] = useState(false);
  const { t } = useLocale();

  return createPortal(
    <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-md rounded-lg bg-background p-6 shadow-xl'>
        {step === 'initial' ? (
          <>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
              {t('deleteCalendar', { calendarName })}
            </h2>
            <p className='mt-3 text-sm text-gray-600 dark:text-gray-300'>
              {t('deleteCalendarMessage', { calendarName })}
            </p>
            <div className='mt-6 flex items-center justify-between'>
              <div className='relative'>
                <button
                  type='button'
                  onClick={() => setShowMergeDropdown(!showMergeDropdown)}
                  className='flex items-center gap-1 rounded-md border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-slate-700'
                >
                  {t('merge')}
                </button>
                {showMergeDropdown && (
                  <div className='absolute top-full left-0 z-10 mt-1 max-h-60 w-max min-w-full overflow-y-auto rounded-md border border-gray-200 bg-background shadow-lg dark:border-slate-700'>
                    {calendars
                      .filter(c => c.id !== calendarId)
                      .map(calendar => (
                        <div
                          key={calendar.id}
                          className='flex cursor-pointer items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700'
                          onClick={() => {
                            onMergeSelect(calendar.id);
                            setShowMergeDropdown(false);
                          }}
                        >
                          <div
                            className='mr-2 h-3 w-3 shrink-0 rounded-sm'
                            style={{
                              backgroundColor: calendar.colors.lineColor,
                            }}
                          />
                          <span className='whitespace-nowrap'>
                            {calendar.name || calendar.id}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className='flex gap-3'>
                <button
                  type='button'
                  onClick={onCancel}
                  className={cancelButton}
                >
                  {t('cancel')}
                </button>
                <button
                  type='button'
                  onClick={() => onStepChange('confirm_delete')}
                  className='rounded-md bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90'
                >
                  {t('delete')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
              {t('confirmDeleteTitle', { calendarName })}
            </h2>
            <p className='mt-3 text-sm text-gray-600 dark:text-gray-300'>
              {t('confirmDeleteMessage')}
            </p>
            <div className='mt-6 flex justify-end gap-3'>
              <button
                type='button'
                onClick={onCancel}
                className='rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'
              >
                {t('cancel')}
              </button>
              <button
                type='button'
                onClick={onConfirmDelete}
                className='rounded-md bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90'
              >
                {t('delete')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
