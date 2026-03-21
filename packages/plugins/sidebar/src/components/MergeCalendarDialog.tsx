import { cancelButton, useLocale } from '@dayflow/core';

import { CalendarChip } from './CalendarChip';

const SOURCE_SENTINEL = '\u0001S\u0001';
const TARGET_SENTINEL = '\u0001T\u0001';

function renderLine(
  line: string,
  source: { name: string; color: string },
  target: { name: string; color: string }
) {
  return line
    .split(new RegExp(`(${SOURCE_SENTINEL}|${TARGET_SENTINEL})`))
    .map((part, i) => {
      if (part === SOURCE_SENTINEL)
        return <CalendarChip key={i} name={source.name} color={source.color} />;
      if (part === TARGET_SENTINEL)
        return <CalendarChip key={i} name={target.name} color={target.color} />;
      return part;
    });
}

interface MergeCalendarDialogProps {
  sourceName: string;
  sourceColor: string;
  targetName: string;
  targetColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const MergeCalendarDialog = ({
  sourceName,
  sourceColor,
  targetName,
  targetColor,
  onConfirm,
  onCancel,
}: MergeCalendarDialogProps) => {
  const { t } = useLocale();
  const source = { name: sourceName, color: sourceColor };
  const target = { name: targetName, color: targetColor };

  const messageTemplate = t('mergeConfirmMessage', {
    sourceName: SOURCE_SENTINEL,
    targetName: TARGET_SENTINEL,
  });
  const messageLines = messageTemplate.split('\n');

  return (
    <div className='df-portal fixed inset-0 z-[9999] flex items-center justify-center bg-black/50'>
      <div className='rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
          {t('mergeConfirmTitle', { sourceName, targetName })}
        </h2>
        <div className='mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300'>
          {messageLines.map((line, i) => (
            <p key={i} className='flex flex-wrap items-center gap-y-0.5'>
              {renderLine(line, source, target)}
            </p>
          ))}
        </div>
        <div className='mt-6 flex justify-end gap-3'>
          <button type='button' onClick={onCancel} className={cancelButton}>
            {t('cancel')}
          </button>
          <button
            type='button'
            onClick={onConfirm}
            className='rounded-md bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90'
          >
            {t('merge')}
          </button>
        </div>
      </div>
    </div>
  );
};
