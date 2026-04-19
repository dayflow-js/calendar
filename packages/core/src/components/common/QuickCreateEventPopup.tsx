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
import { dateToZonedDateTime } from '@/utils/temporalTypeGuards';
import { getNextHourRangeInTimeZone } from '@/utils/timeUtils';

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

  useEffect(() => {
    if (!isOpen) setIsReady(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);
      setInputValue('');
      setSelectedIndex(0);
      return () => window.clearTimeout(focusTimer);
    }
  }, [isOpen]);

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

  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const [arrowLeft, setArrowLeft] = useState(0);

  const nextHourRange = useMemo(
    () => getNextHourRangeInTimeZone(app.timeZone),
    [app.timeZone, isOpen]
  );

  const suggestions: SuggestionItem[] = useMemo(() => {
    if (!inputValue.trim()) return [];

    const results: SuggestionItem[] = [];
    const calendars = app.getCalendars();
    const allEvents = app.getAllEvents();
    const lowerInput = inputValue.toLowerCase();

    const historyEvent = allEvents.find(
      e => e.title.toLowerCase() === lowerInput
    );
    let targetCalendarId = historyEvent?.calendarId;

    if (!targetCalendarId) {
      targetCalendarId = app
        .getCalendarRegistry()
        .getDefaultWritableCalendar()?.id;
    }

    if (targetCalendarId) {
      const resolved = app.getCalendarRegistry().get(targetCalendarId);
      if (resolved?.readOnly || resolved?.subscription) {
        targetCalendarId = app
          .getCalendarRegistry()
          .getDefaultWritableCalendar()?.id;
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

    const seenTitles = new Set<string>([inputValue.toLowerCase()]);

    const matchedEvents = allEvents.filter(e => {
      if (!e.title.toLowerCase().includes(lowerInput)) return false;
      if (seenTitles.has(e.title.toLowerCase())) return false;
      const cal = app.getCalendarRegistry().get(e.calendarId ?? '');
      return !(cal?.readOnly || cal?.subscription);
    });

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
      const popupWidth = 340;

      let left = rect.left + rect.width / 2 - popupWidth / 2;
      const padding = 12;
      const windowWidth = window.innerWidth;

      if (left < padding) left = padding;
      else if (left + popupWidth > windowWidth - padding)
        left = windowWidth - popupWidth - padding;

      const buttonCenterX = rect.left + rect.width / 2;
      setArrowLeft(buttonCenterX - left);

      const spaceAbove = rect.top;
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
      start: dateToZonedDateTime(item.start, app.timeZone),
      end: dateToZonedDateTime(item.end, app.timeZone),
      calendarId: item.calendarId,
      allDay: false,
    };

    app.addEvent(newEvent);
    app.setCurrentDate(item.start);
    app.highlightEvent(newId);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) {
        return;
      }

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
      className='df-portal df-quick-create'
      data-ready={isReady ? 'true' : 'false'}
      style={{
        top: position.top,
        left: position.left,
        visibility: isReady ? 'visible' : 'hidden',
      }}
    >
      <div className='df-quick-create-header'>
        <div className='df-quick-create-title'>
          {t('quickCreateEvent') || 'Quick Create Event'}
        </div>
        <div className='df-quick-create-input-wrap'>
          <input
            ref={inputRef}
            type='text'
            className='df-form-input'
            placeholder={
              t('quickCreatePlaceholder') || 'Enter title (e.g. Code review)'
            }
            value={inputValue}
            onChange={e => setInputValue((e.target as HTMLInputElement).value)}
          />
        </div>
      </div>

      <div className='df-quick-create-list'>
        {suggestions.length === 0 && inputValue && (
          <div className='df-quick-create-empty'>
            {t('noSuggestions') || 'Type to create'}
          </div>
        )}

        {suggestions.map((item, index) => (
          <div
            key={`${item.type}-${index}`}
            className='df-quick-create-item'
            data-selected={index === selectedIndex ? 'true' : 'false'}
            onClick={() => handleCreate(item)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div
              className='df-quick-create-color-bar'
              style={{ backgroundColor: item.color }}
            />
            <div className='df-quick-create-item-content'>
              <div className='df-quick-create-item-title'>{item.title}</div>
              <div>
                <span className='df-quick-create-item-badge'>
                  {item.type === 'new' ? t('today') : t('tomorrow')}
                </span>
              </div>
              <div className='df-quick-create-item-time'>
                {formatTimeRange(item.start, item.end)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Triangle Arrow */}
      <div
        className='df-quick-create-arrow'
        data-placement={placement === 'top' ? 'bottom' : 'top'}
        style={{ left: arrowLeft }}
      />
    </div>,
    document.body
  );
};
