import { useMemo } from 'preact/hooks';
import { BlossomColorPicker } from './BlossomColorPicker';
import {
  hexToHsl,
  lightnessToSliderValue,
} from '@dayflow/blossom-color-picker';

interface DefaultColorPickerProps {
  color: string;
  onChange: (color: { hex: string }, isPending?: boolean) => void;
  onClose?: () => void;
  [key: string]: any;
}

export const DefaultColorPicker = ({
  color,
  onChange,
  onClose,
}: DefaultColorPickerProps) => {
  const blossomValue = useMemo(() => {
    const { h, s, l } = hexToHsl(color);
    const sliderValue = lightnessToSliderValue(l);

    return {
      hue: h,
      saturation: sliderValue,
      lightness: l,
      alpha: 100,
      layer: 'outer' as const,
    };
  }, [color]);

  return (
    <div className="flex justify-center">
      <BlossomColorPicker
        defaultValue={blossomValue}
        coreSize={36}
        petalSize={32}
        initialExpanded={true}
        openOnHover={false}
        onChange={c => onChange({ hex: c.hex }, true)}
        onCollapse={onClose}
      />
    </div>
  );
};
