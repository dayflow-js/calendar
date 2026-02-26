interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export const Switch = ({ checked, onChange, disabled }: SwitchProps) => (
  <div
    className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
      disabled ? 'cursor-default opacity-50' : 'cursor-pointer'
    } ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
    onClick={() => !disabled && onChange(!checked)}
  >
    <div
      className={`h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-5' : ''}`}
    />
  </div>
);
