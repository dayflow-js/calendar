import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import { ChevronDown } from './Icons';

export interface FormSelectOption<T extends string> {
  label: string;
  value: T;
  /** Shown before the label, such as a color dot. */
  prefix?: ComponentChildren;
}

interface FormSelectProps<T extends string> {
  id?: string;
  value: T;
  options: FormSelectOption<T>[];
  disabled?: boolean;
  ariaLabel?: string;
  onChange: (value: T) => void;
}

export const FormSelect = <T extends string>({
  id,
  value,
  options,
  disabled = false,
  ariaLabel,
  onChange,
}: FormSelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);
  const selectedLabel = selected?.label ?? value;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  return (
    <div className='df-form-select' ref={rootRef}>
      <button
        id={id}
        type='button'
        className='df-view-switcher-select-trigger df-form-select-trigger'
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup='listbox'
        onClick={() => setIsOpen(open => !open)}
      >
        <span className='df-form-select-value'>
          {selected?.prefix}
          {selectedLabel}
        </span>
        <span
          className='df-view-switcher-select-chevron'
          data-open={isOpen ? 'true' : 'false'}
        >
          <ChevronDown width={16} height={16} />
        </span>
      </button>

      {isOpen && (
        <div className='df-view-switcher-select-dropdown df-form-select-dropdown df-animate-in df-fade-in df-zoom-in-95'>
          <div className='df-view-switcher-select-list' role='listbox'>
            {options.map(option => (
              <button
                type='button'
                key={option.value}
                className='df-view-switcher-select-option'
                data-active={option.value === value ? 'true' : 'false'}
                role='option'
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.prefix}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormSelect;
