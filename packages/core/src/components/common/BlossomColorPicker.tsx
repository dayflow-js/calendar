import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { BlossomColorPicker as VanillaBlossomColorPicker, BlossomColorPickerOptions } from '@dayflow/blossom-color-picker';

interface BlossomColorPickerProps extends Partial<BlossomColorPickerOptions> {
  className?: string;
}

export const BlossomColorPicker = (props: BlossomColorPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<VanillaBlossomColorPicker | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      const { className, ...options } = props;
      pickerRef.current = new VanillaBlossomColorPicker(containerRef.current, options);
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
      const { className, ...options } = props;
      pickerRef.current.setOptions(options);
    }
  }, [props]);

  return <div ref={containerRef} className={props.className} />;
};
