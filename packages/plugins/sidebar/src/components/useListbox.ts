import { JSX } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';

interface UseListboxOptions {
  /** Number of options, in the order they're rendered. */
  count: number;
  /** Index of the currently chosen option, or -1. */
  selectedIndex: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSelect: (index: number) => void;
  disabled?: boolean;
}

/**
 * Keyboard behaviour for the sidebar dialogs' inline dropdowns, following the
 * same listbox pattern as core's CalendarPicker: focus moves into the listbox
 * on open and the highlighted option is tracked with aria-activedescendant.
 */
export function useListbox({
  count,
  selectedIndex,
  isOpen,
  setIsOpen,
  onSelect,
  disabled = false,
}: UseListboxOptions) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const idPrefix = useId();
  const listboxId = `${idPrefix}-listbox`;
  const optionId = (index: number) => `${idPrefix}-option-${index}`;

  const open = (initial?: 'first' | 'last') => {
    if (disabled || count === 0) return;
    let index = selectedIndex === -1 ? 0 : selectedIndex;
    if (initial === 'first') index = 0;
    if (initial === 'last') index = count - 1;
    setActiveIndex(index);
    setIsOpen(true);
  };

  const close = (returnFocus: boolean) => {
    setIsOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  // Move focus into the listbox when it opens so keyboard users can pick.
  // If it closes some other way (e.g. after an async pick) while it had
  // focus, focus would drop to <body>; put it back on the trigger.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen) {
      listboxRef.current?.focus({ preventScroll: true });
    } else if (
      wasOpen.current &&
      (!document.activeElement || document.activeElement === document.body)
    ) {
      triggerRef.current?.focus();
    }
    wasOpen.current = isOpen;
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
    const last = count - 1;
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
      case ' ':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex <= last) onSelect(activeIndex);
        break;
      case 'Escape':
        // Close only the dropdown, not the dialog around it.
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case 'Tab':
        e.preventDefault();
        close(true);
        break;
      default:
        break;
    }
  };

  const triggerProps = {
    ref: triggerRef,
    onClick: () => (isOpen ? close(false) : open()),
    onKeyDown: handleTriggerKeyDown,
    'aria-haspopup': 'listbox' as const,
    'aria-expanded': isOpen,
    'aria-controls': isOpen ? listboxId : undefined,
  };

  const listboxProps = {
    ref: listboxRef,
    id: listboxId,
    role: 'listbox' as const,
    tabIndex: -1,
    'aria-activedescendant':
      activeIndex >= 0 ? optionId(activeIndex) : undefined,
    onKeyDown: handleListboxKeyDown,
  };

  const getOptionProps = (index: number) => ({
    id: optionId(index),
    role: 'option' as const,
    'aria-selected': index === selectedIndex,
    'data-active': index === activeIndex ? 'true' : undefined,
    onClick: () => onSelect(index),
    onMouseMove: () => {
      if (index !== activeIndex) setActiveIndex(index);
    },
  });

  return {
    triggerRef,
    triggerProps,
    listboxProps,
    getOptionProps,
    idPrefix,
  };
}
