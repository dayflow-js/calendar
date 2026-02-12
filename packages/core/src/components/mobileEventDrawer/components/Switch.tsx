import { h } from 'preact';

interface SwitchProps {
    checked: boolean;
    onChange: (v: boolean) => void;
}

export const Switch = ({ checked, onChange }: SwitchProps & any) => (
    <div
        className={`w-12 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
        onClick={() => onChange(!checked)}
    >
        <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </div>
);
