interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export const Switch = ({ checked, onChange, disabled }: SwitchProps) => (
  <div
    className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${
      disabled
        ? 'cursor-default opacity-50'
        : 'cursor-pointer'
    } ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
    onClick={() => !disabled && onChange(!checked)}
  >
    <div
      className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-5' : ''}`}
    />
  </div>
);
