import React, { useState, useRef, useEffect } from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';
import { getDefaultCalendarRegistry } from '@/core/calendarRegistry';

export interface ColorOption {
  label: string;
  value: string; // calendar ID
}

export interface ColorPickerProps {
  options: ColorOption[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * ColorPicker Component
 * Used to select label colors in calendar or task systems
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
  options,
  value,
  onChange,
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

  // Get currently selected color option
  const currentOption = options.find(o => o.value === value);

  // Get the actual color value for a calendar ID
  const getColorForCalendarId = (calendarId: string): string => {
    const registry = getDefaultCalendarRegistry();
    const colors = registry.resolveColors(calendarId);
    return colors.lineColor; // Use lineColor as the display color
  };

  // Handle color selection
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors h-8"
      >
        <span
          className="w-4 h-4 rounded-sm flex-shrink-0"
          style={{ backgroundColor: getColorForCalendarId(value) }}
        />
        <ChevronsUpDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>

      {isOpen && (
        <ul className="absolute mt-1 w-full min-w-max bg-gray-100 dark:bg-gray-700 rounded-md shadow-lg dark:shadow-gray-900/50 z-10 overflow-hidden border dark:border-gray-600">
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
                className="w-3 h-3 mr-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: getColorForCalendarId(opt.value) }}
              />
              <span className="text-sm whitespace-nowrap">{opt.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ColorPicker;
