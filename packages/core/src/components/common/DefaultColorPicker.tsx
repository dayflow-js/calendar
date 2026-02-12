import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { BlossomColorPicker } from './BlossomColorPicker';
import { hexToHsl, lightnessToSliderValue } from '@dayflow/blossom-color-picker';

interface DefaultColorPickerProps {
  color: string;
  onChange: (color: { hex: string }) => void;
  [key: string]: any;
}

export const DefaultColorPicker = ({ color, onChange }: DefaultColorPickerProps) => {
  const blossomValue = useMemo(() => {
    const { h, s, l } = hexToHsl(color);
    const sliderValue = lightnessToSliderValue(l);

    return {
      hue: h,
      saturation: sliderValue,
      lightness: l,
      alpha: 100,
      layer: 'outer' as const
    };
  }, [color]);

  return (
    <div className="flex justify-center p-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <BlossomColorPicker
        defaultValue={blossomValue}
        coreSize={36}
        petalSize={32}
        openOnHover={false}
        onChange={(c) => onChange({ hex: c.hex })}
      />
    </div>
  );
};
