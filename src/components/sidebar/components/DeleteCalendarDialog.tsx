import React, { useState } from 'react';
import { CalendarType } from '../../../types';
import { cancelButton } from '@/styles/classNames';

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

export const DeleteCalendarDialog: React.FC<DeleteCalendarDialogProps> = ({
  calendarId,
  calendarName,
  calendars,
  step,
  onStepChange,
  onConfirmDelete,
  onCancel,
  onMergeSelect,
}) => {
  const [showMergeDropdown, setShowMergeDropdown] = useState(false);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg p-6 shadow-xl bg-background">
        {step === 'initial' ? (
          <>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Delete &quot;{calendarName}&quot;?
            </h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Do you want to delete &quot;{calendarName}&quot; or merge its events into another existing calendar?
            </p>
            <div className="mt-6 flex justify-between items-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMergeDropdown(!showMergeDropdown)}
                  className="flex items-center gap-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-slate-700"
                >
                  Merge
                </button>
                {showMergeDropdown && (
                  <div className="absolute left-0 top-full mt-1 min-w-full w-max rounded-md border border-gray-200 bg-background shadow-lg dark:border-slate-700 z-10 max-h-60 overflow-y-auto">
                    {calendars
                      .filter(c => c.id !== calendarId)
                      .map(calendar => (
                        <div
                          key={calendar.id}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700 cursor-pointer"
                          onClick={() => {
                            onMergeSelect(calendar.id);
                            setShowMergeDropdown(false);
                          }}
                        >
                          <div
                            className="mr-2 h-3 w-3 rounded-sm shrink-0"
                            style={{ backgroundColor: calendar.colors.lineColor }}
                          />
                          <span className="whitespace-nowrap">{calendar.name || calendar.id}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className={cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onStepChange('confirm_delete')}
                  className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Are you sure you want to delete the calendar &ldquo;{calendarName}&rdquo;?
            </h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              If you delete this calendar, all events associated with the calendar will also be deleted.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
