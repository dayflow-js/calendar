import { JSX } from 'preact';
import { createPortal } from 'preact/compat';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import { MoveRight } from '@/components/common/Icons';
import { getMonthLabels, getWeekDaysLabels } from '@/locale';
import {
  mergeFormatTemplate,
  buildParseRegExp,
  parseTemporalString,
  getZoneId,
  normalizeToZoned,
  formatTemporal,
} from '@/utils/rangePicker';
import { isPlainDate } from '@/utils/temporal';

import RangePickerPanel from './components/RangePickerPanel';
import { DEFAULT_FORMAT, DEFAULT_TIME_FORMAT } from './constants';
import { RangePickerProps, ZonedRange } from './types';

const RangePicker = ({
  value,
  format = DEFAULT_FORMAT,
  showTimeFormat = DEFAULT_TIME_FORMAT,
  showTime = true,
  onChange,
  onOk,
  timeZone,
  disabled = false,
  placement = 'bottomLeft',
  autoAdjustOverflow = true,
  getPopupContainer,
  matchTriggerWidth = false,
  locale = 'en-US',
}: RangePickerProps) => {
  const localeCode = useMemo(
    () => (typeof locale === 'string' ? locale : locale?.code || 'en-US'),
    [locale]
  );

  const isTimeEnabled = useMemo(() => {
    if (showTime === undefined) return true;
    if (typeof showTime === 'object') return true;
    return Boolean(showTime);
  }, [showTime]);

  const monthLabels = useMemo(
    () => getMonthLabels(localeCode, 'short'),
    [localeCode]
  );

  const weekDayLabels = useMemo(
    () => getWeekDaysLabels(localeCode, 'narrow'),
    [localeCode]
  );

  const effectiveTimeFormat = useMemo(() => {
    if (!isTimeEnabled) {
      return '';
    }

    if (typeof showTime === 'object' && showTime?.format) {
      return showTime.format;
    }

    return showTimeFormat;
  }, [isTimeEnabled, showTime, showTimeFormat]);

  const formatTemplate = useMemo(
    () => mergeFormatTemplate(format, effectiveTimeFormat),
    [format, effectiveTimeFormat]
  );

  const parseRegExp = useMemo(
    () => buildParseRegExp(formatTemplate),
    [formatTemplate]
  );

  const normalizedValue = useMemo<ZonedRange>(() => {
    const zone =
      timeZone ??
      (isPlainDate(value[0])
        ? isPlainDate(value[1])
          ? Temporal.Now.timeZoneId()
          : getZoneId(value[1] as Temporal.ZonedDateTime)
        : getZoneId(value[0] as Temporal.ZonedDateTime));

    const start = normalizeToZoned(value[0], zone);
    const end = normalizeToZoned(value[1], zone, start);
    return [start, end];
  }, [value, timeZone]);

  const [draftRange, setDraftRange] = useState<ZonedRange>(normalizedValue);
  const lastNormalizedRef = useRef<ZonedRange>(normalizedValue);
  const [focusedField, setFocusedField] = useState<'start' | 'end'>('start');
  const [inputValues, setInputValues] = useState<[string, string]>([
    formatTemporal(normalizedValue[0], format, effectiveTimeFormat),
    formatTemporal(normalizedValue[1], format, effectiveTimeFormat),
  ]);
  const inputValuesRef = useRef<[string, string]>([
    formatTemporal(normalizedValue[0], format, effectiveTimeFormat),
    formatTemporal(normalizedValue[1], format, effectiveTimeFormat),
  ]);
  const draftRangeRef = useRef<ZonedRange>(normalizedValue);
  const [visibleMonth, setVisibleMonth] = useState<Temporal.PlainDate>(
    normalizedValue[0].toPlainDate().with({ day: 1 })
  );
  const [isOpen, setIsOpenInternal] = useState(false);

  const setIsOpen = useCallback((val: boolean) => {
    setIsOpenInternal(val);
  }, []);
  const [_, setPopupPlacement] = useState(placement);
  const popupPlacementRef = useRef(placement);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const timeListRefs = useRef<{
    start: { hour: HTMLDivElement | null; minute: HTMLDivElement | null };
    end: { hour: HTMLDivElement | null; minute: HTMLDivElement | null };
  }>({
    start: { hour: null, minute: null },
    end: { hour: null, minute: null },
  });
  const committedRef = useRef(false);
  const isEditingRef = useRef(false);

  useEffect(() => {
    inputValuesRef.current = inputValues;
  }, [inputValues]);

  useEffect(() => {
    draftRangeRef.current = draftRange;
  }, [draftRange]);

  useEffect(() => {
    const previous = lastNormalizedRef.current;
    const startChanged =
      Temporal.ZonedDateTime.compare(previous[0], normalizedValue[0]) !== 0;
    const endChanged =
      Temporal.ZonedDateTime.compare(previous[1], normalizedValue[1]) !== 0;

    if (startChanged || endChanged) {
      setDraftRange(normalizedValue);
    }

    lastNormalizedRef.current = normalizedValue;
    // Don't reset focusedField here - it causes the field to switch back to 'start' when selecting time!
  }, [normalizedValue]);

  useEffect(() => {
    setVisibleMonth(normalizedValue[0].toPlainDate().with({ day: 1 }));
  }, [normalizedValue[0]]);

  const alignActiveToTop = useCallback(
    (
      container: HTMLElement | null,
      activeItem: HTMLElement | null,
      topPadding = 0
    ) => {
      if (!container || !activeItem) return;

      const containerRect = container.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const delta =
        itemRect.top - containerRect.top + container.scrollTop - topPadding;

      const prefersReducedMotion = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

      // Only scroll if offset is significant to avoid micro-jitter
      if (Math.abs(container.scrollTop - delta) > 1) {
        container.scrollTo({ top: delta, behavior });
      }
    },
    []
  );

  const scrollToActiveTime = useCallback(
    (field: 'start' | 'end') => {
      // Use double requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const refs = timeListRefs.current[field];
          (['hour', 'minute'] as const).forEach(type => {
            const container = refs[type];
            if (!container) return;
            const active = container.querySelector<HTMLElement>(
              '[data-active="true"]'
            );
            if (active) {
              alignActiveToTop(container, active, 0);
            }
          });
        });
      });
    },
    [alignActiveToTop]
  );

  // Scroll when panel opens or field changes (but NOT when draftRange changes to avoid interfering with user clicks)
  useEffect(() => {
    if (!isOpen || !isTimeEnabled) return;
    scrollToActiveTime(focusedField);
  }, [focusedField, isOpen, scrollToActiveTime, isTimeEnabled]);

  const draftStartEpoch = draftRange[0].epochMilliseconds;
  const draftStartOffset = draftRange[0].offsetNanoseconds;
  const draftEndEpoch = draftRange[1].epochMilliseconds;
  const draftEndOffset = draftRange[1].offsetNanoseconds;

  useEffect(() => {
    // Don't overwrite the input while the user is actively typing
    if (isEditingRef.current) return;

    const [currentStart, currentEnd] = draftRangeRef.current;
    const nextStart = formatTemporal(currentStart, format, effectiveTimeFormat);
    const nextEnd = formatTemporal(currentEnd, format, effectiveTimeFormat);
    const [prevStart, prevEnd] = inputValuesRef.current;

    if (prevStart === nextStart && prevEnd === nextEnd) {
      return;
    }

    inputValuesRef.current = [nextStart, nextEnd];
    setInputValues([nextStart, nextEnd]);
  }, [
    draftStartEpoch,
    draftStartOffset,
    draftEndEpoch,
    draftEndOffset,
    format,
    effectiveTimeFormat,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is inside the input container
      if (containerRef.current?.contains(target)) {
        return;
      }

      // Check if click is inside the popup using both ref and data attribute
      if (popupRef.current?.contains(target)) {
        return;
      }

      const closestPopup = target.closest('[data-range-picker-popup]');
      if (closestPopup) {
        return;
      }

      // Click is outside both container and popup, close it
      setIsOpen(false);
    };

    // Delay adding listener to ensure popup is rendered
    const timerId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100); // Increased delay to ensure Portal is mounted

    return () => {
      clearTimeout(timerId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    // Reset to 'start' when panel closes
    setFocusedField('start');
    if (!committedRef.current) {
      setDraftRange(normalizedValue);
    }
    committedRef.current = false;
  }, [isOpen, normalizedValue]);

  const emitChange = useCallback(
    (range: ZonedRange) => {
      if (!onChange) return;
      onChange(range, [
        formatTemporal(range[0], format, effectiveTimeFormat),
        formatTemporal(range[1], format, effectiveTimeFormat),
      ]);
    },
    [effectiveTimeFormat, format, onChange]
  );

  const emitOk = useCallback(
    (range: ZonedRange) => {
      if (!onOk) return;
      onOk(range, [
        formatTemporal(range[0], format, effectiveTimeFormat),
        formatTemporal(range[1], format, effectiveTimeFormat),
      ]);
    },
    [effectiveTimeFormat, format, onOk]
  );

  const updateRange = useCallback(
    (field: 'start' | 'end', nextValue: Temporal.ZonedDateTime) => {
      setDraftRange(prev => {
        const current: ZonedRange = [...prev] as ZonedRange;
        if (field === 'start') {
          const safeEnd = normalizeToZoned(
            current[1],
            getZoneId(nextValue),
            nextValue
          );
          const adjustedEnd =
            Temporal.ZonedDateTime.compare(nextValue, safeEnd) > 0
              ? nextValue
              : safeEnd;
          return [nextValue, adjustedEnd];
        }

        const safeStart = normalizeToZoned(
          current[0],
          getZoneId(nextValue),
          nextValue
        );
        const adjustedStart =
          Temporal.ZonedDateTime.compare(safeStart, nextValue) > 0
            ? nextValue
            : safeStart;
        return [adjustedStart, nextValue];
      });
    },
    []
  );

  const handleDaySelect = (day: Temporal.PlainDate) => {
    if (disabled) return;

    const buildValue = (
      base: Temporal.ZonedDateTime,
      source: Temporal.PlainDate
    ): Temporal.ZonedDateTime => {
      const zoneId = getZoneId(base);
      return Temporal.ZonedDateTime.from({
        timeZone: zoneId,
        year: source.year,
        month: source.month,
        day: source.day,
        hour: base.hour,
        minute: base.minute,
        second: base.second ?? 0,
        millisecond: base.millisecond ?? 0,
        microsecond: base.microsecond ?? 0,
        nanosecond: base.nanosecond ?? 0,
      });
    };

    if (focusedField === 'start') {
      const nextStart = buildValue(draftRange[0], day);

      // Calculate the duration between original start and end to preserve time span
      const durationMs =
        draftRange[1].epochMilliseconds - draftRange[0].epochMilliseconds;

      // Apply the same duration to the new start time
      const adjustedEnd = nextStart.add({ milliseconds: durationMs });

      const nextRange: ZonedRange = [nextStart, adjustedEnd];
      setDraftRange(nextRange);
      // Don't auto-switch to end, keep user's current field selection
      return;
    }

    const nextEndCandidate = buildValue(draftRange[1], day);

    // Calculate duration to preserve time span
    const durationMs =
      draftRange[1].epochMilliseconds - draftRange[0].epochMilliseconds;

    // If end is before start, treat clicked date as new start and preserve duration
    if (Temporal.ZonedDateTime.compare(nextEndCandidate, draftRange[0]) < 0) {
      const newStart = buildValue(draftRange[0], day);
      const newEnd = newStart.add({ milliseconds: durationMs });
      const nextRange: ZonedRange = [newStart, newEnd];
      setDraftRange(nextRange);
      // Don't auto-switch field, keep user's current selection
      return;
    }

    const nextRange: ZonedRange = [draftRange[0], nextEndCandidate];
    setDraftRange(nextRange);
    setVisibleMonth(nextEndCandidate.toPlainDate().with({ day: 1 }));
  };

  const handleHourSelect = useCallback(
    (field: 'start' | 'end', hour: number) => {
      if (disabled) return;
      const index = field === 'start' ? 0 : 1;
      setDraftRange(prev => {
        const current = prev[index];
        const nextValue = current.with({
          hour,
          minute: current.minute,
          second: 0,
          millisecond: 0,
          microsecond: 0,
          nanosecond: 0,
        });

        // Update the range using the same logic as updateRange
        if (field === 'start') {
          const safeEnd = normalizeToZoned(
            prev[1],
            getZoneId(nextValue),
            nextValue
          );
          const adjustedEnd =
            Temporal.ZonedDateTime.compare(nextValue, safeEnd) > 0
              ? nextValue
              : safeEnd;
          return [nextValue, adjustedEnd];
        }

        const safeStart = normalizeToZoned(
          prev[0],
          getZoneId(nextValue),
          nextValue
        );
        const adjustedStart =
          Temporal.ZonedDateTime.compare(safeStart, nextValue) > 0
            ? nextValue
            : safeStart;
        return [adjustedStart, nextValue];
      });

      // Wait for state update and DOM re-render before scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = timeListRefs.current[field].hour;
          if (!container) return;
          const active = container.querySelector<HTMLElement>(
            '[data-active="true"]'
          );
          if (active) {
            alignActiveToTop(container, active, 0);
          }
        });
      });
    },
    [disabled]
  );

  const handleMinuteSelect = useCallback(
    (field: 'start' | 'end', minute: number) => {
      if (disabled) return;

      const index = field === 'start' ? 0 : 1;
      setDraftRange(prev => {
        const current = prev[index];
        const nextValue = current.with({
          minute,
          second: 0,
          millisecond: 0,
          microsecond: 0,
          nanosecond: 0,
        });

        // Update the range using the same logic as updateRange
        if (field === 'start') {
          const safeEnd = normalizeToZoned(
            prev[1],
            getZoneId(nextValue),
            nextValue
          );
          const adjustedEnd =
            Temporal.ZonedDateTime.compare(nextValue, safeEnd) > 0
              ? nextValue
              : safeEnd;
          return [nextValue, adjustedEnd];
        }

        const safeStart = normalizeToZoned(
          prev[0],
          getZoneId(nextValue),
          nextValue
        );
        const adjustedStart =
          Temporal.ZonedDateTime.compare(safeStart, nextValue) > 0
            ? nextValue
            : safeStart;
        return [adjustedStart, nextValue];
      });

      // Wait for state update and DOM re-render before scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = timeListRefs.current[field].minute;
          if (!container) return;
          const active = container.querySelector<HTMLElement>(
            '[data-active="true"]'
          );
          if (active) {
            alignActiveToTop(container, active, 0);
          }
        });
      });
    },
    [disabled]
  );

  const updateInputValue = useCallback(
    (field: 'start' | 'end', next: string) => {
      const index = field === 'start' ? 0 : 1;
      setInputValues(prev => {
        const candidate: [string, string] = [...prev] as [string, string];
        candidate[index] = next;
        return candidate;
      });
    },
    []
  );

  const commitInputValue = useCallback(
    (field: 'start' | 'end', rawValue: string) => {
      const index = field === 'start' ? 0 : 1;
      const reference = draftRange[index];
      const zoneId = getZoneId(reference);
      const parsed = parseTemporalString(
        rawValue,
        parseRegExp,
        reference,
        zoneId
      );

      if (parsed) {
        updateRange(field, parsed);
        const month = parsed.toPlainDate().with({ day: 1 });
        setVisibleMonth(month);
        if (field === 'start') {
          setFocusedField('end');
        }
        return true;
      }

      setInputValues(prev => {
        const next: [string, string] = [...prev] as [string, string];
        next[index] = formatTemporal(
          draftRange[index],
          format,
          effectiveTimeFormat
        );
        return next;
      });
      return false;
    },
    [draftRange, effectiveTimeFormat, format, parseRegExp, updateRange]
  );

  const handleInputChange = useCallback(
    (field: 'start' | 'end') =>
      (event: JSX.TargetedEvent<HTMLInputElement, globalThis.Event>) => {
        const newValue = event.currentTarget.value;
        isEditingRef.current = true;
        updateInputValue(field, newValue);

        // Try to parse and sync to popup in real-time
        const index = field === 'start' ? 0 : 1;
        const reference = draftRangeRef.current[index];
        const zoneId = getZoneId(reference);
        const parsed = parseTemporalString(
          newValue,
          parseRegExp,
          reference,
          zoneId
        );
        if (parsed) {
          updateRange(field, parsed);
          const month = parsed.toPlainDate().with({ day: 1 });
          setVisibleMonth(month);
          scrollToActiveTime(field);
        }
      },
    [updateInputValue, parseRegExp, updateRange, scrollToActiveTime]
  );

  const handleInputBlur = useCallback(
    (field: 'start' | 'end') =>
      (event: JSX.TargetedFocusEvent<HTMLInputElement>) => {
        if (disabled) return;
        isEditingRef.current = false;

        if (isOpen) {
          // Reset input text to canonical format of current draftRange
          // (draftRange was already synced in real-time for valid inputs)
          const index = field === 'start' ? 0 : 1;
          const formatted = formatTemporal(
            draftRangeRef.current[index],
            format,
            effectiveTimeFormat
          );
          setInputValues(prev => {
            const next: [string, string] = [...prev] as [string, string];
            next[index] = formatted;
            return next;
          });
          return;
        }

        // Only commit if popup is closed
        const relatedTarget = event.relatedTarget as HTMLElement;
        if (!relatedTarget || !containerRef.current?.contains(relatedTarget)) {
          commitInputValue(field, event.currentTarget.value);
        }
      },
    [commitInputValue, disabled, isOpen, format, effectiveTimeFormat]
  );

  const handleInputKeyDown = useCallback(
    (field: 'start' | 'end') =>
      (event: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          isEditingRef.current = false;
          commitInputValue(field, event.currentTarget.value);
        }
        if (event.key === 'Escape') {
          event.currentTarget.blur();
        }
      },
    [commitInputValue]
  );

  const handleOk = () => {
    committedRef.current = true;
    emitChange(draftRange);
    emitOk(draftRange);
    setIsOpen(false);
    // Don't set focusedField here - let the panel close useEffect handle it
  };

  const changeMonth = (months: number) => {
    setVisibleMonth(prev => prev.add({ months }).with({ day: 1 }));
  };

  const changeYear = (years: number) => {
    setVisibleMonth(prev => prev.add({ years }).with({ day: 1 }));
  };

  const calendarDays = useMemo(() => {
    const startOfMonth = visibleMonth;
    const offset = startOfMonth.dayOfWeek % 7;
    const gridStart = startOfMonth.subtract({ days: offset });
    return Array.from({ length: 42 }, (__, index) =>
      gridStart.add({ days: index })
    );
  }, [visibleMonth]);

  const calculateOptimalPlacement = useCallback(
    (basePlacement: typeof placement = placement): typeof placement => {
      if (!autoAdjustOverflow || !containerRef.current) {
        return basePlacement;
      }

      const triggerRect = containerRef.current.getBoundingClientRect();
      const popupHeight = 500; // Approximate popup height
      const popupWidth = matchTriggerWidth ? triggerRect.width : 480; // Approximate popup width

      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const spaceRight = window.innerWidth - triggerRect.left;
      const spaceLeft = triggerRect.right;

      let finalPlacement = basePlacement;

      if (
        finalPlacement.startsWith('bottom') &&
        spaceBelow < popupHeight &&
        spaceAbove > spaceBelow
      ) {
        finalPlacement = finalPlacement.replace(
          'bottom',
          'top'
        ) as typeof placement;
      } else if (
        finalPlacement.startsWith('top') &&
        spaceAbove < popupHeight &&
        spaceBelow > spaceAbove
      ) {
        finalPlacement = finalPlacement.replace(
          'top',
          'bottom'
        ) as typeof placement;
      }

      if (
        finalPlacement.endsWith('Left') &&
        spaceRight < popupWidth &&
        spaceLeft > spaceRight
      ) {
        finalPlacement = finalPlacement.replace(
          'Left',
          'Right'
        ) as typeof placement;
      } else if (
        finalPlacement.endsWith('Right') &&
        spaceLeft < popupWidth &&
        spaceRight > spaceLeft
      ) {
        finalPlacement = finalPlacement.replace(
          'Right',
          'Left'
        ) as typeof placement;
      }

      return finalPlacement;
    },
    [autoAdjustOverflow, matchTriggerWidth, placement]
  );

  const adjustPopupPlacement = useCallback(() => {
    const finalPlacement = calculateOptimalPlacement();
    if (popupPlacementRef.current !== finalPlacement) {
      popupPlacementRef.current = finalPlacement;
      setPopupPlacement(finalPlacement);
    }
  }, [calculateOptimalPlacement]);

  const openPanelForField = (field: 'start' | 'end') => {
    if (disabled) return;
    setFocusedField(field);
    const index = field === 'start' ? 0 : 1;
    const targetMonth = draftRange[index].toPlainDate().with({ day: 1 });
    setVisibleMonth(targetMonth);
    const initialPlacement = calculateOptimalPlacement();
    if (popupPlacementRef.current !== initialPlacement) {
      popupPlacementRef.current = initialPlacement;
      setPopupPlacement(initialPlacement);
    }
    setIsOpen(true);
  };

  // Adjust placement when popup opens and on window resize
  useEffect(() => {
    if (!isOpen) return;
    // Immediately adjust placement to avoid flicker
    adjustPopupPlacement();

    const handleResize = () => adjustPopupPlacement();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, adjustPopupPlacement]);

  const getPopupStyle = (): JSX.CSSProperties => {
    if (!containerRef.current) return {};

    const triggerRect = containerRef.current.getBoundingClientRect();
    const placementDom = popupPlacementRef.current;
    const style: JSX.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
    };

    // Vertical positioning
    if (placementDom.startsWith('bottom')) {
      style.top = triggerRect.bottom + 8;
    } else {
      style.bottom = window.innerHeight - triggerRect.top + 8;
    }

    // Horizontal positioning
    if (placement.endsWith('Left')) {
      style.left = triggerRect.left;
    } else {
      style.right = window.innerWidth - triggerRect.right;
    }

    if (matchTriggerWidth) {
      style.width = `${triggerRect.width}px`;
    }

    return style;
  };

  return (
    <div className='relative max-w-100' ref={containerRef}>
      <div
        className={`flex items-center gap-2 rounded-lg border text-sm shadow-sm transition ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500'
            : isOpen
              ? 'border-primary bg-white shadow-md dark:bg-gray-700'
              : 'border-slate-200 bg-white dark:border-gray-600 dark:bg-gray-700'
        }`}
      >
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <input
            type='text'
            name='range-start'
            value={inputValues[0]}
            onChange={handleInputChange('start')}
            onFocus={() => openPanelForField('start')}
            onClick={() => openPanelForField('start')}
            onBlur={handleInputBlur('start')}
            onKeyDown={handleInputKeyDown('start')}
            className={`w-full rounded-md border px-2 py-1.5 text-sm font-medium transition focus:ring-2 focus:outline-none ${
              disabled
                ? 'cursor-not-allowed border-transparent bg-transparent text-slate-400 dark:text-gray-500'
                : focusedField === 'start' && isOpen
                  ? 'bg-white text-primary dark:bg-gray-700'
                  : 'border-transparent bg-transparent text-slate-700 dark:text-gray-300'
            }`}
            placeholder={formatTemplate}
            autoComplete='off'
            disabled={disabled}
          />
        </div>

        <MoveRight className='text-slate-400 dark:text-gray-500' />

        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <input
            type='text'
            name='range-end'
            value={inputValues[1]}
            onChange={handleInputChange('end')}
            onFocus={() => openPanelForField('end')}
            onClick={() => openPanelForField('end')}
            onBlur={handleInputBlur('end')}
            onKeyDown={handleInputKeyDown('end')}
            className={`w-full rounded-md border px-2 py-1.5 text-sm font-medium transition focus:ring-2 focus:outline-none ${
              disabled
                ? 'cursor-not-allowed border-transparent bg-transparent text-slate-400 dark:text-gray-500'
                : focusedField === 'end' && isOpen
                  ? 'bg-white text-primary dark:bg-gray-700'
                  : 'border-transparent bg-transparent text-slate-700 dark:text-gray-300'
            }`}
            placeholder={formatTemplate}
            autoComplete='off'
            disabled={disabled}
          />
        </div>
      </div>

      {isOpen &&
        (getPopupContainer
          ? createPortal(
              <RangePickerPanel
                visibleMonth={visibleMonth}
                monthLabels={monthLabels}
                weekDayLabels={weekDayLabels}
                calendarDays={calendarDays}
                draftRange={draftRange}
                focusedField={focusedField}
                isTimeEnabled={!!isTimeEnabled}
                disabled={disabled}
                matchTriggerWidth={matchTriggerWidth}
                popupRef={popupRef}
                timeListRefs={timeListRefs}
                onMonthChange={changeMonth}
                onYearChange={changeYear}
                onDaySelect={handleDaySelect}
                onHourSelect={handleHourSelect}
                onMinuteSelect={handleMinuteSelect}
                onOk={handleOk}
                getPopupStyle={getPopupStyle}
              />,
              getPopupContainer()
            )
          : createPortal(
              <RangePickerPanel
                visibleMonth={visibleMonth}
                monthLabels={monthLabels}
                weekDayLabels={weekDayLabels}
                calendarDays={calendarDays}
                draftRange={draftRange}
                focusedField={focusedField}
                isTimeEnabled={!!isTimeEnabled}
                disabled={disabled}
                matchTriggerWidth={matchTriggerWidth}
                popupRef={popupRef}
                timeListRefs={timeListRefs}
                onMonthChange={changeMonth}
                onYearChange={changeYear}
                onDaySelect={handleDaySelect}
                onHourSelect={handleHourSelect}
                onMinuteSelect={handleMinuteSelect}
                onOk={handleOk}
                getPopupStyle={getPopupStyle}
              />,
              document.body
            ))}
    </div>
  );
};

export default RangePicker;
