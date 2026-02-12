import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { ChevronsUpDown, Check } from './Icons';
import { getDefaultCalendarRegistry, CalendarRegistry } from '../../core/calendarRegistry';
import { calendarPickerDropdown } from '@/styles/classNames';

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
}: CalendarPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<any>({});
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Update dropdown position
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const isMobile = variant === 'mobile';

      const style: any = {
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

  // Close dropdown when clicking outside or scrolling
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

  // Get the actual color value for a calendar ID
  const getColorForCalendarId = (calendarId: string): string => {
    const reg = registry || getDefaultCalendarRegistry();
    const colors = reg.resolveColors(calendarId);
    return colors.lineColor; // Use lineColor as the display color
  };

  // Handle color selection
  const handleSelect = (e: any, optionValue: string) => {
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
          data-calendar-picker-dropdown="true"
          style={dropdownStyle}
          className={calendarPickerDropdown}
        >
          {options.map(opt => (
            <div
              key={opt.value}
              className={`flex items-center px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${opt.value === value ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}
              onClick={(e) => handleSelect(e, opt.value)}
            >
              <div className="flex items-center flex-1 min-w-0 mr-3">
                <div className="w-5 flex justify-center mr-2">
                  {opt.value === value && <Check className="w-4 h-4 text-primary" />}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{opt.label}</span>
              </div>
              <span
                className="w-3 h-3 rounded-full shrink-0"
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
        data-calendar-picker-dropdown="true"
        style={dropdownStyle}
        className="bg-white dark:bg-gray-700 rounded-md shadow-lg dark:shadow-gray-900/50 overflow-hidden border border-gray-200 dark:border-gray-600 transition-all duration-200 origin-top-left animate-in fade-in zoom-in-95"
      >
        {options.map(opt => (
          <li
            key={opt.value}
            className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${value === opt.value ? 'font-semibold' : ''
              }`}
            onClick={(e) => handleSelect(e, opt.value)}
          >
            {value === opt.value ? <span className="mr-2 text-sm text-primary">
              <Check width={12} height={12} />
            </span> : <div className="mr-2 text-sm w-3 h-3">&nbsp;</div>}
            <span
              className="w-3 h-3 mr-2 rounded-sm shrink-0"
              style={{ backgroundColor: getColorForCalendarId(opt.value) }}
            />
            <span className="text-sm whitespace-nowrap text-gray-700 dark:text-gray-200">{opt.label}</span>
          </li>
        ))}
      </ul>,
      document.body
    );
  };

  if (variant === 'mobile') {
    return (
      <div className="relative inline-block" ref={pickerRef}>
        <button
          ref={triggerRef}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-1.5 transition-colors"
        >
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getColorForCalendarId(value) }}
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{currentOption?.label || value}</span>
          <ChevronsUpDown className="w-4 h-4 text-gray-400" />
        </button>
        {renderDropdown()}
      </div>
    );
  }

  return (
    <div className="relative inline-block" ref={pickerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors h-8"
      >
        <span
          className="w-4 h-4 rounded-sm shrink-0"
          style={{ backgroundColor: getColorForCalendarId(value) }}
        />
        <ChevronsUpDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
      {renderDropdown()}
    </div>
  );
};

export default CalendarPicker;
