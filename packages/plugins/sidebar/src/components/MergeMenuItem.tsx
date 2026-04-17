import {
  createPortal,
  ChevronRight,
  CalendarType,
  useLocale,
} from '@dayflow/core';
import { useState, useRef, useEffect } from 'preact/hooks';

interface MergeMenuItemProps {
  calendars: CalendarType[];
  currentCalendarId: string;
  onMergeSelect: (targetId: string) => void;
}

const stopPropagation = (e: MouseEvent) => e.stopPropagation();

export const MergeMenuItem = ({
  calendars,
  currentCalendarId,
  onMergeSelect,
}: MergeMenuItemProps) => {
  const { t } = useLocale();
  const [isHovered, setIsHovered] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

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
        className='df-sidebar__submenu-trigger'
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span>{t('merge')}</span>
        <ChevronRight className='df-sidebar__submenu-chevron' />
      </div>
      {isHovered &&
        createPortal(
          <div
            ref={submenuRef}
            data-submenu-content='true'
            className='df-portal df-sidebar__submenu-content df-context-menu__sub-content'
            style={{ top: position.y, left: position.x }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={e => e.stopPropagation()}
          >
            {availableCalendars.map(calendar => (
              <div
                key={calendar.id}
                className='df-sidebar__submenu-item'
                onClick={e => {
                  e.stopPropagation();
                  onMergeSelect(calendar.id);
                }}
              >
                <div
                  className='df-sidebar__swatch'
                  style={{ backgroundColor: calendar.colors.lineColor }}
                />
                <span className='df-sidebar__dropdown-label'>
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
