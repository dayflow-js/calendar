import {
  hexToHsl,
  lightnessToSliderValue,
} from '@dayflow/blossom-color-picker';
import { BlossomColorPicker, useDialogFocus, useLocale } from '@dayflow/core';
import { createPortal } from 'preact/compat';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'preact/hooks';

import { BoardIcon } from './icons';
import type { BoardMessages } from './types';

/** Closes a popover on an outside press or Escape. */
function useDismiss(
  open: boolean,
  close: () => void,
  cancel: () => void = close
) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef({ close, cancel });
  latest.current = { close, cancel };
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) latest.current.close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      latest.current.cancel();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);
  return ref;
}

interface BoardSelectProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  disabled?: boolean;
  onChange: (value: T) => void;
}

/** A compact labelled dropdown in the board toolbar. */
export function BoardSelect<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: BoardSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div className='df-board-select' ref={ref}>
      <button
        type='button'
        className='df-board-select-trigger'
        aria-haspopup='listbox'
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span className='df-board-select-label'>{label}</span>
        <span className='df-board-select-value'>
          {options.find(option => option.value === value)?.label}
        </span>
        <BoardIcon name='chevronDown' size={14} />
      </button>
      {open && (
        <div className='df-board-popover' role='listbox' aria-label={label}>
          {options.map(option => (
            <button
              key={option.value}
              type='button'
              role='option'
              className='df-board-menu-item'
              aria-selected={option.value === value}
              onClick={() => {
                setOpen(false);
                if (option.value !== value) onChange(option.value);
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <BoardIcon name='check' size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const toPickerValue = (hex: string) => {
  const { h, l } = hexToHsl(hex);
  return {
    hue: h,
    saturation: lightnessToSliderValue(l),
    lightness: l,
    alpha: 100,
    layer: 'outer' as const,
  };
};

interface ColumnMenuProps {
  title: string;
  messages: BoardMessages;
  color: string;
  canDelete: boolean;
  onRename: () => void;
  onColor: (color: string) => void;
  onDelete: () => void;
}

/** The "⋯" menu of an editable status column. */
export function ColumnMenu({
  title,
  messages,
  color,
  canDelete,
  onRename,
  onColor,
  onDelete,
}: ColumnMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const run = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <div className='df-board-column-menu' ref={ref}>
      <button
        type='button'
        className='df-board-icon-button'
        aria-label={`${messages.columnMenu}: ${title}`}
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <BoardIcon name='more' size={16} />
      </button>
      {open && (
        <div
          className='df-board-popover'
          role='menu'
          aria-label={`${messages.columnMenu}: ${title}`}
        >
          <button
            type='button'
            role='menuitem'
            className='df-board-menu-item'
            onClick={run(onRename)}
          >
            <BoardIcon name='pencil' size={14} />
            <span>{messages.renameColumn}</span>
          </button>
          <div className='df-board-menu-row' role='group'>
            <BoardIcon name='palette' size={14} />
            <span>{messages.columnColor}</span>
            <BlossomColorPicker
              className='df-board-color-picker'
              defaultValue={toPickerValue(color)}
              coreSize={22}
              petalSize={28}
              openOnHover={false}
              adaptivePositioning
              onChange={next => onColor(next.hex)}
            />
          </div>
          <div className='df-board-menu-separator' />
          <button
            type='button'
            role='menuitem'
            className='df-board-menu-item'
            data-danger
            disabled={!canDelete}
            title={canDelete ? undefined : messages.deleteColumnBlocked}
            onClick={run(onDelete)}
          >
            <BoardIcon name='trash' size={14} />
            <span>{messages.deleteColumn}</span>
          </button>
        </div>
      )}
    </div>
  );
}

interface RenamePopoverProps {
  value: string;
  messages: BoardMessages;
  onDone: (value: string | null) => void;
}

/** Inline rename box shown over a column header, like Notion's. */
export function RenamePopover({ value, messages, onDone }: RenamePopoverProps) {
  const input = useRef<HTMLInputElement>(null);
  // Pressing elsewhere keeps the typed name, as Notion does.
  const ref = useDismiss(
    true,
    () => onDone(input.current?.value ?? null),
    () => onDone(null)
  );
  useLayoutEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  return (
    <div
      ref={ref}
      className='df-board-rename'
      onPointerDown={event => event.stopPropagation()}
    >
      <form
        onSubmit={event => {
          event.preventDefault();
          onDone(input.current?.value ?? null);
        }}
      >
        <input
          ref={input}
          aria-label={messages.renameColumn}
          defaultValue={value}
          onKeyDown={event => event.stopPropagation()}
        />
        <button type='submit' className='df-board-primary'>
          {messages.done}
          <BoardIcon name='enter' size={13} />
        </button>
      </form>
    </div>
  );
}

export interface ColumnOption {
  id: string;
  title: string;
  color: string;
}

interface DeleteColumnDialogProps {
  column: ColumnOption;
  taskCount: number;
  /** Columns that can take this column's tasks. */
  targets: ColumnOption[];
  messages: BoardMessages;
  onMerge: (targetId: string) => void;
  onDelete: () => void;
  onCancel: () => void;
}

type DeleteStep =
  | { kind: 'choose' }
  | { kind: 'delete' }
  | { kind: 'merge'; target: ColumnOption };

const fill = (template: string, values: Record<string, string>) =>
  template.replaceAll(
    /\{(\w+)\}/g,
    (match, key: string) => values[key] ?? match
  );

/**
 * Deleting a column works like deleting a calendar: merge its tasks into
 * another column, or delete them with it. Either way is confirmed first.
 */
export function DeleteColumnDialog({
  column,
  taskCount,
  targets,
  messages,
  onMerge,
  onDelete,
  onCancel,
}: DeleteColumnDialogProps) {
  const { t } = useLocale();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<DeleteStep>({
    kind: taskCount > 0 ? 'choose' : 'delete',
  });
  const [picking, setPicking] = useState(false);
  const pickerRef = useDismiss(picking, () => setPicking(false));
  // Escape closes the column list first, then the dialog.
  useDialogFocus(dialogRef, {
    onClose: picking ? () => setPicking(false) : onCancel,
  });
  const names = { title: column.title };

  const content =
    step.kind === 'choose'
      ? {
          title: fill(messages.deleteColumnTitle, names),
          text: fill(messages.deleteColumnMessage, names),
        }
      : step.kind === 'delete'
        ? {
            title: fill(messages.confirmDeleteColumnTitle, names),
            text:
              taskCount > 0
                ? messages.confirmDeleteColumnMessage
                : messages.deleteColumnEmpty,
          }
        : {
            title: fill(messages.mergeColumnTitle, {
              source: column.title,
              target: step.target.title,
            }),
            text: fill(messages.mergeColumnMessage, {
              source: column.title,
              target: step.target.title,
            }),
          };

  return createPortal(
    <div
      className='df-portal df-board-dialog-overlay'
      onMouseDown={event => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className='df-board-dialog'
        role='alertdialog'
        aria-modal='true'
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className='df-board-dialog-title'>
          {content.title}
        </h2>
        <p className='df-board-dialog-text'>{content.text}</p>
        <div className='df-board-dialog-actions' data-step={step.kind}>
          {step.kind === 'choose' && targets.length > 0 && (
            <div className='df-board-dialog-merge' ref={pickerRef}>
              <button
                type='button'
                className='df-board-ghost'
                aria-haspopup='menu'
                aria-expanded={picking}
                onClick={() => setPicking(!picking)}
              >
                {messages.merge}
                <BoardIcon name='chevronDown' size={14} />
              </button>
              {picking && (
                <div
                  className='df-board-popover'
                  role='menu'
                  aria-label={messages.merge}
                >
                  {targets.map(target => (
                    <button
                      key={target.id}
                      type='button'
                      role='menuitem'
                      className='df-board-menu-item'
                      onClick={() => {
                        setPicking(false);
                        setStep({ kind: 'merge', target });
                      }}
                    >
                      <span
                        className='df-board-dialog-swatch'
                        style={{ background: target.color }}
                      />
                      <span>{target.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button type='button' className='df-board-ghost' onClick={onCancel}>
            {messages.cancel}
          </button>
          <button
            type='button'
            className='df-board-primary'
            data-danger
            onClick={() => {
              if (step.kind === 'choose') setStep({ kind: 'delete' });
              else if (step.kind === 'delete') onDelete();
              else onMerge(step.target.id);
            }}
          >
            {step.kind === 'merge' ? messages.merge : t('delete')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
