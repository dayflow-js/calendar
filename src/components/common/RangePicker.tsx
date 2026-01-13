import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactDOM from 'react-dom';
import { Temporal } from 'temporal-polyfill';
import { isPlainDate } from '../../utils/temporal';
import {
  mergeFormatTemplate,
  buildParseRegExp,
  parseTemporalString,
  getZoneId,
  normalizeToZoned,
  formatTemporal,
  pad,
} from '../../utils/rangePicker';
import { MoveRight, ChevronsRight, ChevronRight, ChevronLeft, ChevronsLeft } from 'lucide-react';
import { getMonthLabels, getWeekDaysLabels } from '@/locale';

type ZonedRange = [Temporal.ZonedDateTime, Temporal.ZonedDateTime];

export interface RangePickerProps {
  value: [
    Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
    Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
  ];
  format?: string;
  showTimeFormat?: string;
  showTime?: boolean | { format?: string };
  onChange?: (value: ZonedRange, dateString: [string, string]) => void;
  onOk?: (value: ZonedRange, dateString: [string, string]) => void;
  timeZone?: string;
  disabled?: boolean;
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
  autoAdjustOverflow?: boolean;
  getPopupContainer?: () => HTMLElement;
  matchTriggerWidth?: boolean;
  locale?: string;
}

const DEFAULT_FORMAT = 'YYYY-MM-DD HH:mm';
const DEFAULT_TIME_FORMAT = 'HH:mm';
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];


const compareDates = (
  a: Temporal.PlainDate,
  b: Temporal.PlainDate
): number => {
  return Temporal.PlainDate.compare(a, b);
};

const RangePicker: React.FC<RangePickerProps> = ({
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
}) => {
  const isTimeEnabled = useMemo(() => {
    if (showTime === undefined) return true;
    if (typeof showTime === 'object') return true;
    return Boolean(showTime);
  }, [showTime]);

  const monthLabels = useMemo(() => {
    return getMonthLabels(locale, 'short');
  }, [locale]);

  const weekDayLabels = useMemo(() => {
    return getWeekDaysLabels(locale, 'narrow');
  }, [locale]);

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
      (!isPlainDate(value[0])
        ? getZoneId(value[0] as Temporal.ZonedDateTime)
        : !isPlainDate(value[1])
          ? getZoneId(value[1] as Temporal.ZonedDateTime)
          : Temporal.Now.timeZoneId());

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

  const setIsOpen = useCallback((value: boolean) => {
    setIsOpenInternal(value);
  }, []);
  const [popupPlacement, setPopupPlacement] = useState(placement);
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
    (container: HTMLElement | null, activeItem: HTMLElement | null, topPadding = 0) => {
      if (!container || !activeItem) return;

      const containerRect = container.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const delta = (itemRect.top - containerRect.top) + container.scrollTop - topPadding;

      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
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
            const active = container.querySelector<HTMLElement>('[data-active="true"]');
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
    const [currentStart, currentEnd] = draftRangeRef.current;
    const nextStart = formatTemporal(
      currentStart,
      format,
      effectiveTimeFormat
    );
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

      const closestPopup = target.closest('[data-rangepicker-popup]');
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
      const durationMs = draftRange[1].epochMilliseconds - draftRange[0].epochMilliseconds;

      // Apply the same duration to the new start time
      const adjustedEnd = nextStart.add({ milliseconds: durationMs });

      const nextRange: ZonedRange = [nextStart, adjustedEnd];
      setDraftRange(nextRange);
      // Don't auto-switch to end, keep user's current field selection
      return;
    }

    const nextEndCandidate = buildValue(draftRange[1], day);

    // Calculate duration to preserve time span
    const durationMs = draftRange[1].epochMilliseconds - draftRange[0].epochMilliseconds;

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

  const handleHourSelect = useCallback((field: 'start' | 'end', hour: number) => {
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
        const active = container.querySelector<HTMLElement>('[data-active="true"]');
        if (active) {
          alignActiveToTop(container, active, 0);
        }
      });
    });
  }, [disabled]);

  const handleMinuteSelect = useCallback((field: 'start' | 'end', minute: number) => {
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
        const active = container.querySelector<HTMLElement>('[data-active="true"]');
        if (active) {
          alignActiveToTop(container, active, 0);
        }
      });
    });
  }, [disabled]);

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
      const parsed = parseTemporalString(rawValue, parseRegExp, reference, zoneId);

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
      (event: React.ChangeEvent<HTMLInputElement>) => {
        updateInputValue(field, event.target.value);
      },
    [updateInputValue]
  );

  const handleInputBlur = useCallback(
    (field: 'start' | 'end') =>
      (event: React.FocusEvent<HTMLInputElement>) => {
        if (disabled) return;
        // If popup is open, don't do anything on blur
        // The popup will handle its own interactions
        if (isOpen) {
          return;
        }

        // Only commit if popup is closed
        const relatedTarget = event.relatedTarget as HTMLElement;
        if (!relatedTarget || !containerRef.current?.contains(relatedTarget)) {
          commitInputValue(field, event.target.value);
        }
      },
    [commitInputValue, disabled, isOpen]
  );

  const handleInputKeyDown = useCallback(
    (field: 'start' | 'end') =>
      (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          event.preventDefault();
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
    setVisibleMonth(prev =>
      prev.add({ months }).with({ day: 1 })
    );
  };

  const changeYear = (years: number) => {
    setVisibleMonth(prev =>
      prev.add({ years }).with({ day: 1 })
    );
  };

  const calendarDays = useMemo(() => {
    const startOfMonth = visibleMonth;
    const offset = startOfMonth.dayOfWeek % 7;
    const gridStart = startOfMonth.subtract({ days: offset });
    return Array.from({ length: 42 }, (_, index) =>
      gridStart.add({ days: index })
    );
  }, [visibleMonth]);

  const startDate = draftRange[0].toPlainDate();
  const endDate = draftRange[1].toPlainDate();

  const renderDayCell = (day: Temporal.PlainDate) => {
    const isOutsideMonth = day.month !== visibleMonth.month;
    const isStart = compareDates(day, startDate) === 0;
    const isEnd = compareDates(day, endDate) === 0;
    const isInRange =
      compareDates(day, startDate) >= 0 && compareDates(day, endDate) <= 0;

    const baseClasses =
      'flex h-9 w-9 items-center justify-center rounded-md text-sm transition';

    const stateClass = (() => {
      if (isStart || isEnd) {
        return 'bg-primary text-primary-foreground font-semibold';
      }
      if (isInRange) {
        return 'bg-primary/10 text-primary';
      }
      if (isOutsideMonth) {
        return 'text-slate-300 dark:text-gray-600';
      }
      return 'text-slate-700 dark:text-gray-300 hover:bg-primary/10 hover:text-primary';
    })();

    return (
      <button
        key={day.toString()}
        type="button"
        disabled={disabled}
        onClick={() => handleDaySelect(day)}
        className={`${baseClasses} ${stateClass}`}
      >
        {day.day}
      </button>
    );
  };

  const renderTimeSelectors = () => {
    // Always show the time selector for the current focusedField
    const field = focusedField;
    const index = field === 'start' ? 0 : 1;
    const current = draftRange[index];
    const currentMinute = current.minute;
    const minuteOptions = MINUTES.includes(currentMinute)
      ? MINUTES
      : [...MINUTES, currentMinute].sort((a, b) => a - b);

    return (
      <div className="flex flex-col rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm sm:w-28">
        <div className="flex border-b border-slate-100 dark:border-gray-600 justify-center">
          <div className='text-lg py-1 text-slate-700 dark:text-gray-300'>{current.hour.toString().padStart(2, '0')}:{current.minute.toString().padStart(2, '0')}</div>
        </div>

        {/* Hour and Minute Selectors */}
        <div className="flex p-1">
          <div className="w-14">
            <div
              className="h-72 overflow-y-auto rounded-md border border-slate-100 dark:border-gray-600 bg-white dark:bg-gray-700"
              role="listbox"
              aria-label="Hour"
              ref={element => {
                timeListRefs.current[field].hour = element;
              }}
            >
              {HOURS.map(hour => {
                const isActive = hour === current.hour;
                return (
                  <button
                    key={hour}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    disabled={disabled}
                    onClick={() => handleHourSelect(field, hour)}
                    className={`flex h-8 w-full items-center justify-center text-sm transition ${isActive
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-slate-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary'
                      }`}
                    data-active={isActive ? 'true' : undefined}
                  >
                    {pad(hour)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="w-14">
            <div
              className="h-72 overflow-y-auto rounded-md border border-slate-100 dark:border-gray-600 bg-white dark:bg-gray-700"
              role="listbox"
              aria-label="Minute"
              ref={element => {
                timeListRefs.current[field].minute = element;
              }}
            >
              {minuteOptions.map(minute => {
                const isActive = minute === currentMinute;
                return (
                  <button
                    key={minute}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    disabled={disabled}
                    onClick={() => handleMinuteSelect(field, minute)}
                    className={`flex h-8 w-full items-center justify-center text-sm transition ${isActive
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-slate-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary'
                      }`}
                    data-active={isActive ? 'true' : undefined}
                  >
                    {pad(minute)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const calculateOptimalPlacement = useCallback(
    (basePlacement: typeof placement = placement): typeof placement => {
      if (!autoAdjustOverflow || !containerRef.current) {
        return basePlacement;
      }

      const triggerRect = containerRef.current.getBoundingClientRect();
      const popupHeight = 500; // Approximate popup height
      const popupWidth = matchTriggerWidth
        ? triggerRect.width
        : 480; // Approximate popup width

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
        finalPlacement = finalPlacement.replace('bottom', 'top') as typeof placement;
      } else if (
        finalPlacement.startsWith('top') &&
        spaceAbove < popupHeight &&
        spaceBelow > spaceAbove
      ) {
        finalPlacement = finalPlacement.replace('top', 'bottom') as typeof placement;
      }

      if (
        finalPlacement.endsWith('Left') &&
        spaceRight < popupWidth &&
        spaceLeft > spaceRight
      ) {
        finalPlacement = finalPlacement.replace('Left', 'Right') as typeof placement;
      } else if (
        finalPlacement.endsWith('Right') &&
        spaceLeft < popupWidth &&
        spaceRight > spaceLeft
      ) {
        finalPlacement = finalPlacement.replace('Right', 'Left') as typeof placement;
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

  const getPopupStyle = (): React.CSSProperties => {
    if (!containerRef.current) return {};

    const triggerRect = containerRef.current.getBoundingClientRect();
    const placement = popupPlacementRef.current;
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
    };

    // Vertical positioning
    if (placement.startsWith('bottom')) {
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

  const panel = (
    <div
      ref={popupRef}
      style={getPopupStyle()}
      data-rangepicker-popup="true"
    >
      <div
        className="space-y-3 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3"
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          width: matchTriggerWidth ? '100%' : undefined,
        }}
      >
        <div className="flex gap-1">
          <div className="flex-3 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm w-full">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-300">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => changeYear(-1)}
                  className="rounded-md px-2 py-1 text-slate-400 dark:text-gray-400 transition hover:text-slate-600 dark:hover:text-gray-200 disabled:opacity-40"
                >
                  <ChevronsLeft width={14} height={12} />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => changeMonth(-1)}
                  className="rounded-md px-2 py-1 text-slate-400 dark:text-gray-400 transition hover:text-slate-600 dark:hover:text-gray-200 disabled:opacity-40"
                >
                  <ChevronLeft width={14} height={12} />
                </button>
              </div>
              <div className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                {monthLabels[visibleMonth.month - 1]} {visibleMonth.year}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => changeMonth(1)}
                  className="rounded-md px-2 py-1 text-slate-400 dark:text-gray-400 transition hover:text-slate-600 dark:hover:text-gray-200 disabled:opacity-40"
                >
                  <ChevronRight width={14} height={12} />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => changeYear(1)}
                  className="rounded-md px-2 py-1 text-slate-400 dark:text-gray-400 transition hover:text-slate-600 dark:hover:text-gray-200 disabled:opacity-40"
                >
                  <ChevronsRight width={14} height={12} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 px-3 pb-3 pt-2 text-center text-[11px] uppercase tracking-wide text-slate-400 dark:text-gray-500">
              {weekDayLabels.map((day, index) => (
                <span key={index}>{day}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 px-1 ">
              {calendarDays.map(renderDayCell)}
            </div>
          </div>

          {isTimeEnabled && (
            <div className="flex flex-1 justify-end sm:w-32">
              {renderTimeSelectors()}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleOk}
            disabled={disabled}
            className="inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative max-w-100" ref={containerRef}>
      <div
        className={`flex items-center gap-2 rounded-lg border text-sm shadow-sm transition ${disabled
          ? 'cursor-not-allowed border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500'
          : isOpen
            ? 'border-primary bg-white dark:bg-gray-700 shadow-md'
            : 'border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700'
          }`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            type="text"
            value={inputValues[0]}
            onChange={handleInputChange('start')}
            onFocus={() => openPanelForField('start')}
            onClick={() => openPanelForField('start')}
            onBlur={handleInputBlur('start')}
            onKeyDown={handleInputKeyDown('start')}
            className={`w-full rounded-md border px-2 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 ${disabled
              ? 'cursor-not-allowed border-transparent bg-transparent text-slate-400 dark:text-gray-500'
              : focusedField === 'start' && isOpen
                ? ' bg-white dark:bg-gray-700 text-primary'
                : 'border-transparent bg-transparent text-slate-700 dark:text-gray-300'
              }`}
            placeholder={formatTemplate}
            autoComplete="off"
            disabled={disabled}
          />
        </div>

        <MoveRight className="text-slate-400 dark:text-gray-500" />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            type="text"
            value={inputValues[1]}
            onChange={handleInputChange('end')}
            onFocus={() => openPanelForField('end')}
            onClick={() => openPanelForField('end')}
            onBlur={handleInputBlur('end')}
            onKeyDown={handleInputKeyDown('end')}
            className={`w-full rounded-md border px-2 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 ${disabled
              ? 'cursor-not-allowed border-transparent bg-transparent text-slate-400 dark:text-gray-500'
              : focusedField === 'end' && isOpen
                ? 'bg-white dark:bg-gray-700 text-primary'
                : 'border-transparent bg-transparent text-slate-700 dark:text-gray-300'
              }`}
            placeholder={formatTemplate}
            autoComplete="off"
            disabled={disabled}
          />
        </div>
      </div>

      {isOpen && (getPopupContainer ? ReactDOM.createPortal(panel, getPopupContainer()) : ReactDOM.createPortal(panel, document.body))}
    </div>
  );
};

export default RangePicker;
