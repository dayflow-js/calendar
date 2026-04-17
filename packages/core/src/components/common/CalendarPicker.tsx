import { JSX } from 'preact';
import { createPortal } from 'preact/compat';
import { useState, useRef, useEffect } from 'preact/hooks';

import {
  getDefaultCalendarRegistry,
  CalendarRegistry,
} from '@/core/calendarRegistry';
import { calendarPickerDropdown } from '@/styles/classNames';

import { ChevronsUpDown, Check } from './Icons';

export interface CalendarOption {
  label: string;
  value: string; // calendar ID
}

export interface CalendarPickerProps {
  options: CalendarOption[];
  value: string;
  onChange: (value: string) => void;
  registry?: CalendarRegistry;
  variant?: 'desktop' | 'mobile';
  disabled?: boolean;
}

/**
 * CalendarPicker Component
 * Used to select which calendar an event belongs to
 */
export const CalendarPicker = ({
  options,
  value,
  onChange,
  registry,
  variant = 'desktop',
  disabled = false,
}: CalendarPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<JSX.CSSProperties>({});
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const isMobile = variant === 'mobile';

      const style: JSX.CSSProperties = {
        position: 'fixed',
        zIndex: 10001,
        minWidth: isMobile ? '12rem' : `${rect.width}px`,
        top: `${rect.bottom + 4}px`,
      };

      if (isMobile) {
        style.right = `${window.innerWidth - rect.right}px`;
      } else {
        style.left = `${rect.left}px`;
      }

      setDropdownStyle(style);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('[data-calendar-picker-dropdown]')
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const getColorForCalendarId = (calendarId: string): string => {
    const reg = registry || getDefaultCalendarRegistry();
    const colors = reg.resolveColors(calendarId);
    return colors.lineColor;
  };

  const handleSelect = (
    e: JSX.TargetedMouseEvent<HTMLElement>,
    optionValue: string
  ) => {
    e.stopPropagation();
    onChange(optionValue);
    setIsOpen(false);
  };

  const currentOption = options.find(o => o.value === value);

  const renderDropdown = () => {
    if (!isOpen || typeof window === 'undefined') return null;

    if (variant === 'mobile') {
      return createPortal(
        <div
          data-calendar-picker-dropdown='true'
          style={dropdownStyle}
          className={calendarPickerDropdown}
        >
          {options.map(opt => (
            <div
              key={opt.value}
              className='df-calendar-picker__option df-calendar-picker__option--mobile'
              data-selected={opt.value === value ? 'true' : 'false'}
              onClick={e => handleSelect(e, opt.value)}
            >
              <div className='df-calendar-picker__option-inner'>
                <div className='df-calendar-picker__check-area'>
                  {opt.value === value && (
                    <Check className='df-text-primary h-4 w-4' />
                  )}
                </div>
                <span className='df-calendar-picker__option-label'>
                  {opt.label}
                </span>
              </div>
              <span
                className='df-calendar-picker__color-swatch df-calendar-picker__color-swatch--sm'
                style={{ backgroundColor: getColorForCalendarId(opt.value) }}
              />
            </div>
          ))}
        </div>,
        document.body
      );
    }

    return createPortal(
      <ul
        data-calendar-picker-dropdown='true'
        style={dropdownStyle}
        className='df-portal df-animate-in df-fade-in df-zoom-in-95 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg transition-all duration-200 dark:border-gray-600 dark:bg-gray-700 dark:shadow-gray-900/50'
      >
        {options.map(opt => (
          <li
            key={opt.value}
            className='df-calendar-picker__option'
            data-selected={value === opt.value ? 'true' : 'false'}
            onClick={e => handleSelect(e, opt.value)}
          >
            {value === opt.value ? (
              <span className='df-text-primary mr-2 text-sm'>
                <Check width={12} height={12} />
              </span>
            ) : (
              <div className='mr-2 h-3 w-3 text-sm'>&nbsp;</div>
            )}
            <span
              className='df-calendar-picker__color-swatch mr-2'
              style={{ backgroundColor: getColorForCalendarId(opt.value) }}
            />
            <span className='df-calendar-picker__option-label'>
              {opt.label}
            </span>
          </li>
        ))}
      </ul>,
      document.body
    );
  };

  if (variant === 'mobile') {
    return (
      <div className='df-calendar-picker' ref={pickerRef}>
        <button
          type='button'
          ref={triggerRef}
          disabled={disabled}
          onClick={e => {
            e.stopPropagation();
            if (!disabled) setIsOpen(!isOpen);
          }}
          className='df-calendar-picker__trigger df-calendar-picker__trigger--mobile'
        >
          <span
            className='df-calendar-picker__color-swatch df-calendar-picker__color-swatch--sm'
            style={{ backgroundColor: getColorForCalendarId(value) }}
          />
          <span className='df-calendar-picker__label'>
            {currentOption?.label || value}
          </span>
          <ChevronsUpDown className='df-text-muted h-4 w-4' />
        </button>
        {renderDropdown()}
      </div>
    );
  }

  return (
    <div className='df-calendar-picker' ref={pickerRef}>
      <button
        ref={triggerRef}
        type='button'
        onClick={e => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className='df-calendar-picker__trigger'
      >
        <span
          className='df-calendar-picker__color-swatch'
          style={{ backgroundColor: getColorForCalendarId(value) }}
        />
        <ChevronsUpDown className='df-text-muted h-4 w-4' />
      </button>
      {renderDropdown()}
    </div>
  );
};

export default CalendarPicker;
