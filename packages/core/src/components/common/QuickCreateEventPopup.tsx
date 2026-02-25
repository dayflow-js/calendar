import { RefObject } from 'preact';
import { createPortal } from 'preact/compat';
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useLayoutEffect,
} from 'preact/hooks';

import { useLocale } from '@/locale';
import { ICalendarApp, Event } from '@/types';
import { generateUniKey } from '@/utils/helpers';
import { dateToZonedDateTime } from '@/utils/temporal';

interface QuickCreateEventPopupProps {
  app: ICalendarApp;
  anchorRef: RefObject<HTMLElement>;
  onClose: () => void;
  isOpen: boolean;
}

interface SuggestionItem {
  type: 'new' | 'history';
  title: string;
  calendarId: string;
  color: string;
  start: Date;
  end: Date;
}

// Format time for display (e.g., 10:00 - 11:00)
const formatTime = (d: Date) =>
  d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const formatTimeRange = (start: Date, end: Date) =>
  `${formatTime(start)} - ${formatTime(end)}`;

export const QuickCreateEventPopup = ({
  app,
  anchorRef,
  onClose,
  isOpen,
}: QuickCreateEventPopupProps) => {
  const { t } = useLocale();
  const [inputValue, setInputValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setIsReady(false);
    }
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure render
      setTimeout(() => inputRef.current?.focus(), 50);
      setInputValue('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  // Calculate Position
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const [arrowLeft, setArrowLeft] = useState(0);

  // Time Calculation
  const nextHourRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(start.getHours() + 1, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    return { start, end };
  }, [isOpen]); // Recalculate on open

  // Generate Suggestions
  const suggestions: SuggestionItem[] = useMemo(() => {
    if (!inputValue.trim()) return [];

    const results: SuggestionItem[] = [];
    const calendars = app.getCalendars();
    const allEvents = app.getAllEvents();
    const lowerInput = inputValue.toLowerCase();

    // Try to find if this title exists in history to pick calendar
    const historyEvent = allEvents.find(
      e => e.title.toLowerCase() === lowerInput
    );
    let targetCalendarId = historyEvent?.calendarId;

    if (!targetCalendarId) {
      // Pick random calendar if no history
      const visibleCalendars = calendars.filter(c => c.isVisible !== false);
      if (visibleCalendars.length > 0) {
        const randomIndex = Math.floor(Math.random() * visibleCalendars.length);
        targetCalendarId = visibleCalendars[randomIndex].id;
      } else if (calendars.length > 0) {
        targetCalendarId = calendars[0].id;
      }
    }

    const targetCalendar = calendars.find(c => c.id === targetCalendarId);
    const color = targetCalendar?.colors.lineColor || '#3b82f6';

    results.push({
      type: 'new',
      title: inputValue,
      calendarId: targetCalendarId || '',
      color,
      start: nextHourRange.start,
      end: nextHourRange.end,
    });

    // History Suggestions
    // Filter events that match input (fuzzy-ish: simple includes)
    // Deduplicate by title
    const seenTitles = new Set<string>([inputValue.toLowerCase()]); // Don't show exact match again in history if it's same as input

    const matchedEvents = allEvents.filter(
      e =>
        e.title.toLowerCase().includes(lowerInput) &&
        !seenTitles.has(e.title.toLowerCase())
    );

    matchedEvents.slice(0, 5).forEach(e => {
      seenTitles.add(e.title.toLowerCase());
      const cal = calendars.find(c => c.id === e.calendarId);
      results.push({
        type: 'history',
        title: e.title,
        calendarId: e.calendarId || '',
        color: cal?.colors.lineColor || '#9ca3af',
        start: nextHourRange.start,
        end: nextHourRange.end,
      });
    });

    return results;
  }, [inputValue, app, nextHourRange]);

  useLayoutEffect(() => {
    if (isOpen && anchorRef.current && popupRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const popupHeight = popupRef.current.offsetHeight;
      const popupWidth = 340; // Fixed width

      // Calculate initial left (centered)
      let left = rect.left + rect.width / 2 - popupWidth / 2;

      // Horizontal Boundary Check
      const padding = 12;
      const windowWidth = window.innerWidth;

      if (left < padding) {
        left = padding;
      } else if (left + popupWidth > windowWidth - padding) {
        left = windowWidth - popupWidth - padding;
      }

      // Calculate arrow offset relative to popup
      // Button Center X = rect.left + rect.width / 2
      // Arrow Offset = Button Center X - Popup Left
      const buttonCenterX = rect.left + rect.width / 2;
      const calculatedArrowLeft = buttonCenterX - left;
      setArrowLeft(calculatedArrowLeft);

      // Check space above using actual height
      const spaceAbove = rect.top;
      // Add some buffer for the browser chrome/safe area
      const requiredSpace = popupHeight + 20;

      let newTop = 0;
      let newPlacement: 'top' | 'bottom' = 'top';

      if (spaceAbove < requiredSpace) {
        newPlacement = 'bottom';
        newTop = rect.bottom + 12;
      } else {
        newPlacement = 'top';
        newTop = rect.top - 12 - popupHeight;
      }

      setPlacement(newPlacement);
      setPosition({ top: newTop, left });
      setIsReady(true);
    }
  }, [isOpen, anchorRef, suggestions]);

  const handleCreate = (item: SuggestionItem) => {
    if (!item.calendarId) return;

    const newId = generateUniKey();
    const newEvent: Event = {
      id: newId,
      title: item.title,
      start: dateToZonedDateTime(item.start),
      end: dateToZonedDateTime(item.end),
      calendarId: item.calendarId,
      allDay: false,
    };

    app.addEvent(newEvent);
    app.setCurrentDate(item.start);
    app.highlightEvent(newId);
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(
          prev => (prev - 1 + suggestions.length) % suggestions.length
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          handleCreate(suggestions[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, suggestions, selectedIndex]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={popupRef}
      className={`fixed z-1000 flex w-85 flex-col rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800 ${isReady ? 'animate-in fade-in zoom-in-95 duration-100' : ''}`}
      style={{
        top: position.top,
        left: position.left,
        visibility: isReady ? 'visible' : 'hidden',
      }}
    >
      <div className='p-4 pb-2'>
        <div className='mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400'>
          {t('quickCreateEvent') || 'Quick Create Event'}
        </div>
        <div className='relative'>
          <input
            ref={inputRef}
            type='text'
            className='w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-gray-900 shadow-sm transition focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
            placeholder={
              t('quickCreatePlaceholder') || 'Enter title (e.g. Code review)'
            }
            value={inputValue}
            onChange={e => setInputValue((e.target as HTMLInputElement).value)}
          />
        </div>
      </div>

      <div className='max-h-75 flex-1 overflow-y-auto px-2 py-1'>
        {suggestions.length === 0 && inputValue && (
          <div className='px-4 py-3 text-center text-sm text-gray-400'>
            {t('noSuggestions') || 'Type to create'}
          </div>
        )}

        {suggestions.map((item, index) => (
          <div
            key={`${item.type}-${index}`}
            className={`flex cursor-pointer items-center rounded-lg px-4 py-2 transition-colors ${
              index === selectedIndex
                ? 'bg-primary/10 ring-1 ring-primary/20 ring-inset dark:bg-primary/20'
                : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
            }`}
            onClick={() => handleCreate(item)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div
              className='mr-3 h-8 w-1 shrink-0 rounded-full'
              style={{ backgroundColor: item.color }}
            />
            <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
              <div className='truncate text-sm font-medium text-gray-900 dark:text-gray-100'>
                {item.title}
              </div>
              <div className='flex'>
                <span className='rounded bg-gray-100 px-1 text-[10px] font-semibold text-gray-500 dark:bg-slate-700 dark:text-gray-400'>
                  {item.type === 'new' ? t('today') : t('tomorrow')}
                </span>
              </div>
              <div className='text-xs text-gray-500 dark:text-gray-400'>
                {formatTimeRange(item.start, item.end)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Triangle Arrow */}
      <div
        className={`absolute h-3 w-3 -translate-x-1/2 rotate-45 border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800 ${
          placement === 'top'
            ? '-bottom-1.5 border-r border-b'
            : '-top-1.5 border-t border-l'
        }`}
        style={{
          left: arrowLeft,
        }}
      />
    </div>,
    document.body
  );
};
