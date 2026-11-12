interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export const Switch = ({ checked, onChange, disabled, label }: SwitchProps) => (
  <button
    type='button'
    role='switch'
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    data-checked={String(checked)}
    data-disabled={String(!!disabled)}
    className='df-mobile-switch'
    onClick={() => !disabled && onChange(!checked)}
  >
    <span className='df-mobile-switch-thumb' />
  </button>
);
