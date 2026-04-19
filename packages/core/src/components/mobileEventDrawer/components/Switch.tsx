interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export const Switch = ({ checked, onChange, disabled }: SwitchProps) => (
  <button
    type='button'
    role='switch'
    aria-checked={checked}
    disabled={disabled}
    data-checked={String(checked)}
    data-disabled={String(!!disabled)}
    className='df-mobile-switch'
    onClick={() => !disabled && onChange(!checked)}
  >
    <span className='df-mobile-switch-thumb' />
  </button>
);
