import { JSX } from 'preact';
import { createPortal } from 'preact/compat';
import { useState, useRef, useEffect, useMemo } from 'preact/hooks';

import {
  getDefaultCalendarRegistry,
  CalendarRegistry,
} from '@/core/calendarRegistry';
import { useLocale } from '@/locale';
import { calendarPickerDropdown } from '@/styles/classNames';

import { ChevronsUpDown } from './Icons';

export interface CalendarOption {
  label: string;
  value: string; // calendar ID
  group?: string;
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
  const { t } = useLocale();
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

  const groupedOptions = useMemo(() => {
    const hasGroups = options.some(o => !!o.group);
    if (!hasGroups) {
      return [{ group: null, items: options }];
    }
    const ungrouped: CalendarOption[] = [];
    const groupMap = new Map<string, CalendarOption[]>();

    for (const opt of options) {
      if (opt.group) {
        const list = groupMap.get(opt.group) || [];
        list.push(opt);
        groupMap.set(opt.group, list);
      } else {
        ungrouped.push(opt);
      }
    }

    const result: { group: string | null; items: CalendarOption[] }[] = [];
    if (ungrouped.length > 0) {
      result.push({ group: null, items: ungrouped });
    }
    for (const [groupName, items] of groupMap.entries()) {
      result.push({ group: groupName, items });
    }
    return result;
  }, [options]);

  const renderDropdown = () => {
    if (!isOpen || typeof window === 'undefined') return null;

    if (variant === 'mobile') {
      return createPortal(
        <div
          data-calendar-picker-dropdown='true'
          style={dropdownStyle}
          className={calendarPickerDropdown}
        >
          {groupedOptions.map(section => (
            <div key={section.group ?? '__default'}>
              {section.group && (
                <div className='df-calendar-picker-group-label'>
                  {section.group}
                </div>
              )}
              {section.items.map(opt => (
                <div
                  key={opt.value}
                  className='df-calendar-picker-option df-calendar-picker-option-mobile'
                  data-selected={opt.value === value ? 'true' : 'false'}
                  onClick={e => handleSelect(e, opt.value)}
                >
                  <span
                    className='df-calendar-picker-color-swatch df-calendar-picker-color-swatch-sm'
                    style={{
                      backgroundColor: getColorForCalendarId(opt.value),
                    }}
                  />
                  <span className='df-calendar-picker-option-label'>
                    {opt.label}
                  </span>
                </div>
              ))}
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
        className={calendarPickerDropdown}
      >
        {groupedOptions.map(section => (
          <div key={section.group ?? '__default'}>
            {section.group && (
              <li className='df-calendar-picker-group-label'>
                {section.group}
              </li>
            )}
            {section.items.map(opt => (
              <li
                key={opt.value}
                className='df-calendar-picker-option'
                data-selected={value === opt.value ? 'true' : 'false'}
                onClick={e => handleSelect(e, opt.value)}
              >
                <span
                  className='df-calendar-picker-color-swatch df-calendar-picker-color-swatch-sm'
                  style={{ backgroundColor: getColorForCalendarId(opt.value) }}
                />
                <span className='df-calendar-picker-option-label'>
                  {opt.label}
                </span>
              </li>
            ))}
          </div>
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
          className='df-calendar-picker-trigger df-calendar-picker-trigger-mobile'
          aria-expanded={isOpen}
        >
          <span
            className='df-calendar-picker-color-swatch df-calendar-picker-color-swatch-sm'
            style={{ backgroundColor: getColorForCalendarId(value) }}
          />
          <span className='df-calendar-picker-label'>
            {currentOption?.label || value}
          </span>
          <ChevronsUpDown className='df-text-muted' />
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
        className='df-calendar-picker-trigger'
        aria-label={`${t('calendar')}: ${currentOption?.label || value}`}
        aria-expanded={isOpen}
      >
        <span
          className='df-calendar-picker-color-swatch'
          style={{ backgroundColor: getColorForCalendarId(value) }}
        />
        <ChevronsUpDown className='df-text-muted' />
      </button>
      {renderDropdown()}
    </div>
  );
};

export default CalendarPicker;
