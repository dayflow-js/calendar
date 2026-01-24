import React, { useState, useRef, useEffect } from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';
import { getDefaultCalendarRegistry, CalendarRegistry } from '../../core/calendarRegistry';

export interface ColorOption {
  label: string;
  value: string; // calendar ID
}

export interface ColorPickerProps {
  options: ColorOption[];
  value: string;
  onChange: (value: string) => void;
  registry?: CalendarRegistry;
  variant?: 'desktop' | 'mobile';
}

/**
 * ColorPicker Component
 * Used to select label colors in calendar or task systems
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
  options,
  value,
  onChange,
  registry,
  variant = 'desktop',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get the actual color value for a calendar ID
  const getColorForCalendarId = (calendarId: string): string => {
    const reg = registry || getDefaultCalendarRegistry();
    const colors = reg.resolveColors(calendarId);
    return colors.lineColor; // Use lineColor as the display color
  };

  // Handle color selection
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const currentOption = options.find(o => o.value === value);

  if (variant === 'mobile') {
    return (
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-1.5 transition-colors"
        >
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getColorForCalendarId(value) }}
          />
          <span className="text-sm font-medium">{currentOption?.label || value}</span>
          <ChevronsUpDown className="w-4 h-4 text-gray-400" />
        </button>

        <div className={`absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden transition-all duration-200 origin-top-right ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
          {options.map(opt => (
            <div
              key={opt.value}
              className={`flex items-center px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${opt.value === value ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}
              onClick={() => handleSelect(opt.value)}
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
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-block" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors h-8"
      >
        <span
          className="w-4 h-4 rounded-sm shrink-0"
          style={{ backgroundColor: getColorForCalendarId(value) }}
        />
        <ChevronsUpDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>

      <ul 
        className={`absolute mt-1 w-full min-w-max bg-gray-100 dark:bg-gray-700 rounded-md shadow-lg dark:shadow-gray-900/50 z-10 overflow-hidden border border-gray-200 dark:border-gray-600 transition-all duration-200 origin-top-left ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        {options.map(opt => (
          <li
            key={opt.value}
            className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${value === opt.value ? 'font-semibold' : ''
              }`}
            onClick={() => handleSelect(opt.value)}
          >
            {value === opt.value ? <span className="mr-2 text-sm">
              <Check width={12} height={12} />
            </span> : <div className="mr-2 text-sm w-3 h-3">&nbsp;</div>}
            <span
              className="w-3 h-3 mr-2 rounded-sm shrink-0"
              style={{ backgroundColor: getColorForCalendarId(opt.value) }}
            />
            <span className="text-sm whitespace-nowrap">{opt.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ColorPicker;