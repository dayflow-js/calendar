import { useLocale } from '@/locale';
import type { EventKind, ICalendarApp } from '@/types';

/** Whether the detail editors may turn an event into a task or back. */
export const canSwitchEventKind = (app?: ICalendarApp) =>
  app?.state?.views?.get(app.state.currentView)?.lockEventKind !== true;

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
