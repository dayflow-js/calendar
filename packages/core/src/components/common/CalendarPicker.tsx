import { JSX } from 'preact';
import { createPortal } from 'preact/compat';
import { useState, useRef, useEffect, useMemo, useId } from 'preact/hooks';

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
  const [activeIndex, setActiveIndex] = useState(-1);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLElement>(null);
  const idPrefix = useId();
  const listboxId = `${idPrefix}-listbox`;
  const optionId = (index: number) => `${idPrefix}-option-${index}`;

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

  const close = (returnFocus: boolean) => {
    setIsOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const handleSelect = (
    e: JSX.TargetedEvent<HTMLElement>,
    optionValue: string
  ) => {
    e.stopPropagation();
    onChange(optionValue);
    close(true);
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

  // Options in the order they're rendered, so arrow keys follow the visual list.
  const flatOptions = useMemo(
    () => groupedOptions.flatMap(section => section.items),
    [groupedOptions]
  );

  const open = (initial?: 'first' | 'last') => {
    if (disabled || flatOptions.length === 0) return;
    const selectedIndex = flatOptions.findIndex(o => o.value === value);
    let index = selectedIndex === -1 ? 0 : selectedIndex;
    if (initial === 'first') index = 0;
    if (initial === 'last') index = flatOptions.length - 1;
    setActiveIndex(index);
    setIsOpen(true);
  };

  // Move focus into the listbox when it opens so keyboard users can pick.
  useEffect(() => {
    if (isOpen) listboxRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const el = listboxRef.current?.querySelector<HTMLElement>(
      "[role='option'][data-active='true']"
    );
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  const handleTriggerKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLElement>) => {
    if (isOpen) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      open(e.key === 'ArrowUp' ? 'last' : undefined);
    }
  };

  const handleListboxKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLElement>) => {
    const last = flatOptions.length - 1;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, last));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(last);
        break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const option = flatOptions[activeIndex];
        if (option) handleSelect(e, option.value);
        break;
      }
      case 'Escape':
        // Don't let an enclosing dialog close as well.
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case 'Tab':
        // The listbox is portalled to <body>; send focus back to the trigger
        // rather than letting Tab jump to the end of the document.
        e.preventDefault();
        close(true);
        break;
      default:
        break;
    }
  };

  const renderOption = (opt: CalendarOption, mobile: boolean) => {
    const index = flatOptions.indexOf(opt);
    const Tag = mobile ? 'div' : 'li';
    return (
      <Tag
        key={opt.value}
        id={optionId(index)}
        role='option'
        aria-selected={opt.value === value}
        className={
          mobile
            ? 'df-calendar-picker-option df-calendar-picker-option-mobile'
            : 'df-calendar-picker-option'
        }
        data-selected={opt.value === value ? 'true' : 'false'}
        data-active={index === activeIndex ? 'true' : undefined}
        onClick={e => handleSelect(e, opt.value)}
        onMouseMove={() => {
          if (index !== activeIndex) setActiveIndex(index);
        }}
      >
        <span
          className='df-calendar-picker-color-swatch df-calendar-picker-color-swatch-sm'
          style={{ backgroundColor: getColorForCalendarId(opt.value) }}
          aria-hidden='true'
        />
        <span className='df-calendar-picker-option-label'>{opt.label}</span>
      </Tag>
    );
  };

  const renderSections = (mobile: boolean) =>
    groupedOptions.map((section, sectionIndex) => {
      const groupLabelId = `${idPrefix}-group-${sectionIndex}`;
      const LabelTag = mobile ? 'div' : 'li';
      return (
        <div
          key={section.group ?? '__default'}
          role={section.group ? 'group' : 'presentation'}
          aria-labelledby={section.group ? groupLabelId : undefined}
        >
          {section.group && (
            <LabelTag
              id={groupLabelId}
              role='presentation'
              className='df-calendar-picker-group-label'
            >
              {section.group}
            </LabelTag>
          )}
          {section.items.map(opt => renderOption(opt, mobile))}
        </div>
      );
    });

  const renderDropdown = () => {
    if (!isOpen || typeof window === 'undefined') return null;

    const mobile = variant === 'mobile';
    const ListTag = mobile ? 'div' : 'ul';
    return createPortal(
      <ListTag
        ref={listboxRef as never}
        id={listboxId}
        role='listbox'
        tabIndex={-1}
        aria-label={t('calendar')}
        aria-activedescendant={
          activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
        onKeyDown={handleListboxKeyDown}
        data-calendar-picker-dropdown='true'
        style={dropdownStyle}
        className={calendarPickerDropdown}
      >
        {renderSections(mobile)}
      </ListTag>,
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
            if (isOpen) close(false);
            else open();
          }}
          onKeyDown={handleTriggerKeyDown}
          className='df-calendar-picker-trigger df-calendar-picker-trigger-mobile'
          aria-haspopup='listbox'
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
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
          if (isOpen) close(false);
          else open();
        }}
        onKeyDown={handleTriggerKeyDown}
        className='df-calendar-picker-trigger'
        aria-label={`${t('calendar')}: ${currentOption?.label || value}`}
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
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
