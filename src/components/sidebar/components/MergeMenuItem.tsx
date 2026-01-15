import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';
import { CalendarType } from '../../../types';
import { useLocale } from '@/locale';

interface MergeMenuItemProps {
  calendars: CalendarType[];
  currentCalendarId: string;
  onMergeSelect: (targetId: string) => void;
}

export const MergeMenuItem: React.FC<MergeMenuItemProps> = ({
  calendars,
  currentCalendarId,
  onMergeSelect,
}) => {
  const { t } = useLocale();
  const [isHovered, setIsHovered] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      setPosition({ x: rect.right, y: rect.top });
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 100);
  };

  useEffect(() => {
    const el = submenuRef.current;
    if (el) {
      const stopPropagation = (e: MouseEvent) => e.stopPropagation();
      el.addEventListener('mousedown', stopPropagation);
      return () => {
        el.removeEventListener('mousedown', stopPropagation);
      };
    }
  }, [isHovered]);

  const availableCalendars = calendars.filter(c => c.id !== currentCalendarId);

  if (availableCalendars.length === 0) return null;

  return (
    <>
      <div
        ref={itemRef}
        className="relative flex cursor-default select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-50"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span>{t('merge')}</span>
        <ChevronRight className="h-4 w-4" />
      </div>
      {isHovered && createPortal(
        <div
          ref={submenuRef}
          className="fixed z-60 min-w-48 overflow-hidden rounded-md border border-slate-200 bg-white p-1 shadow-md dark:border-slate-800 dark:bg-slate-950 animate-in fade-in-0 zoom-in-95 duration-100"
          style={{ top: position.y, left: position.x }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {availableCalendars.map(calendar => (
            <div
              key={calendar.id}
              className="flex items-center cursor-pointer rounded-sm px-2 py-1.5 text-sm text-slate-900 hover:bg-slate-100 dark:text-slate-50 dark:hover:bg-slate-800"
              onClick={(e) => {
                e.stopPropagation();
                onMergeSelect(calendar.id);
              }}
            >
              <div
                className="mr-2 h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: calendar.colors.lineColor }}
              />
              <span className="truncate">
                {calendar.name || calendar.id}
              </span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};
