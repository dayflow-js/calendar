import { cancelButton } from '@/styles/classNames';

import { useLocale } from '@/locale';

interface MergeCalendarDialogProps {
  sourceName: string;
  targetName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const MergeCalendarDialog = ({
  sourceName,
  targetName,
  onConfirm,
  onCancel,
}: MergeCalendarDialogProps) => {
  const { t } = useLocale();
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg p-6 shadow-xl bg-background">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('mergeConfirmTitle', { sourceName, targetName })}
        </h2>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          {t('mergeConfirmMessage', { sourceName, targetName })}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className={cancelButton}>
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            {t('merge')}
          </button>
        </div>
      </div>
    </div>
  );
};
