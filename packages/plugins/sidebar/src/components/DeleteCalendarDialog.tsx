import {
  createPortal,
  CalendarType,
  useLocale,
  LoadingButton,
} from '@dayflow/core';
import { useState } from 'preact/hooks';

import { CalendarChip } from './CalendarChip';

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
  step,
  onStepChange,
  onConfirmDelete,
  onCancel,
  onMergeSelect,
}: DeleteCalendarDialogProps) => {
  const [showMergeDropdown, setShowMergeDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLocale();
  const calendarColor =
    calendars.find(c => c.id === calendarId)?.colors.lineColor ?? '#6b7280';

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
    <div className='df-sidebar__overlay'>
      <div className='df-sidebar__dialog'>
        {step === 'initial' ? (
          <>
            <h2 className='df-sidebar__dialog-title'>
              {t('deleteCalendar', { calendarName })}
            </h2>
            <p className='df-sidebar__dialog-text df-sidebar__dialog-line'>
              {renderWithChip(
                t('deleteCalendarMessage', { calendarName: CAL_SENTINEL }),
                calendarName,
                calendarColor
              )}
            </p>
            <div className='df-sidebar__dialog-split-actions'>
              <div className='df-sidebar__field'>
                <button
                  type='button'
                  disabled={isLoading}
                  onClick={() => setShowMergeDropdown(!showMergeDropdown)}
                  className='df-sidebar__button df-sidebar__button--secondary'
                >
                  {t('merge')}
                </button>
                {showMergeDropdown && (
                  <div className='df-sidebar__dropdown'>
                    {calendars
                      .filter(c => c.id !== calendarId)
                      .map(calendar => (
                        <div
                          key={calendar.id}
                          className='df-sidebar__dropdown-item'
                          onClick={() => {
                            handleMergeSelect(calendar.id);
                          }}
                        >
                          <div
                            className='df-sidebar__swatch'
                            style={{
                              backgroundColor: calendar.colors.lineColor,
                            }}
                          />
                          <span className='df-sidebar__dropdown-label'>
                            {calendar.name || calendar.id}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className='df-sidebar__button-row'>
                <button
                  type='button'
                  onClick={onCancel}
                  disabled={isLoading}
                  className='df-sidebar__button df-sidebar__button--secondary'
                >
                  {t('cancel')}
                </button>
                <button
                  type='button'
                  onClick={() => onStepChange('confirm_delete')}
                  disabled={isLoading}
                  className='df-sidebar__button df-sidebar__button--destructive'
                >
                  {t('delete')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className='df-sidebar__dialog-title'>
              {t('confirmDeleteTitle', { calendarName })}
            </h2>
            <p className='df-sidebar__dialog-text'>
              {t('confirmDeleteMessage')}
            </p>
            <div className='df-sidebar__dialog-actions'>
              <button
                type='button'
                onClick={onCancel}
                disabled={isLoading}
                className='df-sidebar__button df-sidebar__button--secondary'
              >
                {t('cancel')}
              </button>
              <LoadingButton
                type='button'
                onClick={handleConfirmDelete}
                loading={isLoading}
                className='df-sidebar__button df-sidebar__button--destructive'
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
