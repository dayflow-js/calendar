import { useLocale, LoadingButton } from '@dayflow/core';
import { useState } from 'preact/hooks';

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
  onConfirm: () => void | Promise<void>;
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
  const [isLoading, setIsLoading] = useState(false);
  const source = { name: sourceName, color: sourceColor };
  const target = { name: targetName, color: targetColor };

  const messageTemplate = t('mergeConfirmMessage', {
    sourceName: SOURCE_SENTINEL,
    targetName: TARGET_SENTINEL,
  });
  const messageLines = messageTemplate.split('\n');

  const handleConfirm = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='df-sidebar-overlay'>
      <div className='df-sidebar-dialog'>
        <h2 className='df-sidebar-dialog-title'>
          {t('mergeConfirmTitle', { sourceName, targetName })}
        </h2>
        <div className='df-sidebar-dialog-lines'>
          {messageLines.map((line, i) => (
            <p key={i} className='df-sidebar-dialog-line'>
              {renderLine(line, source, target)}
            </p>
          ))}
        </div>
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
            onClick={handleConfirm}
            loading={isLoading}
            className='df-sidebar-button df-sidebar-button-destructive'
          >
            {t('merge')}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
};
