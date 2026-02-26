import {
  BlossomColorPicker as VanillaBlossomColorPicker,
  BlossomColorPickerOptions,
} from '@dayflow/blossom-color-picker';
import { useEffect, useRef } from 'preact/hooks';

interface BlossomColorPickerProps extends Partial<BlossomColorPickerOptions> {
  className?: string;
}

export const BlossomColorPicker = (props: BlossomColorPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<VanillaBlossomColorPicker | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      const { ...options } = props;
      pickerRef.current = new VanillaBlossomColorPicker(
        containerRef.current,
        options
      );

      if (options.initialExpanded) {
        pickerRef.current.expand();
      }
    }

    return () => {
      if (pickerRef.current) {
        pickerRef.current.destroy();
        pickerRef.current = null;
      }
    };
  }, []);

  // Handle updates to options
  useEffect(() => {
    if (pickerRef.current) {
      const { ...options } = props;
      pickerRef.current.setOptions(options);
    }
  }, [props]);

  return <div ref={containerRef} className={props.className} />;
};
