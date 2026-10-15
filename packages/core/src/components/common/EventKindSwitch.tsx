import { useLocale } from '@/locale';
import type { EventKind } from '@/types';

interface EventKindSwitchProps {
  value: EventKind;
  disabled?: boolean;
  onChange: (kind: EventKind) => void;
}

const KINDS: readonly EventKind[] = ['event', 'task'];

/** Segmented Event / Task control shown at the top of the detail editors. */
export const EventKindSwitch = ({
  value,
  disabled = false,
  onChange,
}: EventKindSwitchProps) => {
  const { t } = useLocale();

  return (
    <div
      className='df-kind-switch'
      role='radiogroup'
      aria-label={`${t('event')} / ${t('task')}`}
    >
      {KINDS.map(kind => (
        <button
          key={kind}
          type='button'
          role='radio'
          aria-checked={value === kind}
          className='df-kind-switch-option'
          data-active={String(value === kind)}
          disabled={disabled}
          onClick={() => {
            if (value !== kind) onChange(kind);
          }}
        >
          {t(kind)}
        </button>
      ))}
    </div>
  );
};
