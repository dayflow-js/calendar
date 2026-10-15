import { LoadingButton, useDialogFocus, useLocale } from '@dayflow/core';
import { JSX } from 'preact';
import { createPortal } from 'preact/compat';
import { useId, useMemo, useRef, useState } from 'preact/hooks';

interface GroupNameDialogProps {
  title: string;
  inputId: string;
  initialName: string;
  existingGroupNames: string[];
  submitLabel: string;
  onSubmit: (name: string) => void | Promise<void>;
  onCancel: () => void;
}

const GroupNameDialog = ({
  title,
  inputId,
  initialName,
  existingGroupNames,
  submitLabel,
  onSubmit,
  onCancel,
}: GroupNameDialogProps) => {
  const { t } = useLocale();
  const titleId = useId();
  const [name, setName] = useState(initialName);
  const [isLoading, setIsLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, { onClose: isLoading ? undefined : onCancel });
  const trimmedName = name.trim();
  const isDuplicate = useMemo(
    () =>
      existingGroupNames.some(
        existingName =>
          existingName !== initialName &&
          existingName.toLocaleLowerCase() === trimmedName.toLocaleLowerCase()
      ),
    [existingGroupNames, initialName, trimmedName]
  );
  const canSubmit =
    trimmedName.length > 0 && trimmedName !== initialName && !isDuplicate;

  const handleSubmit = async (
    event: JSX.TargetedSubmitEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!canSubmit || isLoading) return;

    setIsLoading(true);
    try {
      await onSubmit(trimmedName);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className='df-sidebar-overlay'>
      <div
        ref={dialogRef}
        className='df-sidebar-dialog'
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className='df-sidebar-dialog-title'>
          {title}
        </h2>
        <form onSubmit={handleSubmit}>
          <label className='df-sidebar-group-name-label' htmlFor={inputId}>
            {t('groupName')}
          </label>
          <input
            id={inputId}
            autoFocus
            type='text'
            value={name}
            disabled={isLoading}
            className='df-sidebar-group-name-input'
            placeholder={t('groupNamePlaceholder')}
            onInput={event =>
              setName((event.currentTarget as HTMLInputElement).value)
            }
          />
          {isDuplicate && (
            <div className='df-sidebar-error' role='alert'>
              {t('groupNameExists')}
            </div>
          )}
          <div className='df-sidebar-dialog-actions'>
            <button
              type='button'
              disabled={isLoading}
              className='df-sidebar-button df-sidebar-button-secondary'
              onClick={onCancel}
            >
              {t('cancel')}
            </button>
            <LoadingButton
              type='submit'
              loading={isLoading}
              disabled={!canSubmit || isLoading}
              className='df-sidebar-button df-sidebar-button-primary'
            >
              {submitLabel}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

interface CreateGroupDialogProps {
  existingGroupNames: string[];
  onCreate: (name: string) => void | Promise<void>;
  onCancel: () => void;
}

export const CreateGroupDialog = ({
  existingGroupNames,
  onCreate,
  onCancel,
}: CreateGroupDialogProps) => {
  const { t } = useLocale();

  return (
    <GroupNameDialog
      title={t('newGroup')}
      inputId='new-group-name'
      initialName=''
      existingGroupNames={existingGroupNames}
      submitLabel={t('create')}
      onSubmit={onCreate}
      onCancel={onCancel}
    />
  );
};

interface RenameGroupDialogProps {
  groupName: string;
  existingGroupNames: string[];
  onRename: (name: string) => void | Promise<void>;
  onCancel: () => void;
}

export const RenameGroupDialog = ({
  groupName,
  existingGroupNames,
  onRename,
  onCancel,
}: RenameGroupDialogProps) => {
  const { t } = useLocale();
  return (
    <GroupNameDialog
      title={t('renameGroup')}
      inputId='group-name'
      initialName={groupName}
      existingGroupNames={existingGroupNames}
      submitLabel={t('save')}
      onSubmit={onRename}
      onCancel={onCancel}
    />
  );
};

interface DeleteGroupDialogProps {
  groupName: string;
  calendarCount: number;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const DeleteGroupDialog = ({
  groupName,
  calendarCount,
  onConfirm,
  onCancel,
}: DeleteGroupDialogProps) => {
  const { t } = useLocale();
  const titleId = useId();
  const [isLoading, setIsLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, { onClose: isLoading ? undefined : onCancel });

  const handleConfirm = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className='df-sidebar-overlay'>
      <div
        ref={dialogRef}
        className='df-sidebar-dialog'
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className='df-sidebar-dialog-title'>
          {t('deleteGroupTitle', { groupName })}
        </h2>
        <p className='df-sidebar-dialog-text'>
          {t('deleteGroupMessage', {
            calendarCount: String(calendarCount),
          })}
        </p>
        <div className='df-sidebar-dialog-actions'>
          <button
            type='button'
            disabled={isLoading}
            className='df-sidebar-button df-sidebar-button-secondary'
            onClick={onCancel}
          >
            {t('cancel')}
          </button>
          <LoadingButton
            type='button'
            loading={isLoading}
            onClick={handleConfirm}
            className='df-sidebar-button df-sidebar-button-destructive'
          >
            {t('delete')}
          </LoadingButton>
        </div>
      </div>
    </div>,
    document.body
  );
};
