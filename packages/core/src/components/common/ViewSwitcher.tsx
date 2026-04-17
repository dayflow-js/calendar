import { useState, useRef, useEffect } from 'preact/hooks';

import { useLocale } from '@/locale';
import { TranslationKey } from '@/locale/types';
import { CalendarViewType, ICalendarApp } from '@/types';

import { ChevronDown } from './Icons';

interface ViewSwitcherProps {
  calendar: ICalendarApp;
  mode?: 'buttons' | 'select';
}

const getViewLabel = (
  viewType: CalendarViewType,
  calendar: ICalendarApp,
  t: (key: TranslationKey) => string
): string => {
  const label = calendar.state.views.get(viewType)?.label;
  if (label) {
    return label;
  }

  const translated = t(viewType as TranslationKey);
  if (translated !== viewType) {
    return translated;
  }

  return viewType
    .split(/[-_]/g)
    .map(segment =>
      segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : segment
    )
    .join(' ');
};

const ViewSwitcher = ({ calendar, mode = 'buttons' }: ViewSwitcherProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useLocale();

  const registeredViews = Array.from(calendar.state.views.keys());
  const currentView = calendar.state.currentView;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (registeredViews.length <= 1) {
    return null;
  }

  if (mode === 'select') {
    return (
      <div className='df-view-switcher-select' ref={dropdownRef}>
        <button
          type='button'
          onClick={() => setIsOpen(!isOpen)}
          className='df-view-switcher-select__trigger'
          aria-expanded={isOpen}
          aria-haspopup='listbox'
        >
          <span>{getViewLabel(currentView, calendar, t)}</span>
          <span
            className='df-view-switcher-select__chevron'
            data-open={isOpen ? 'true' : 'false'}
          >
            <ChevronDown width={16} height={16} />
          </span>
        </button>

        {isOpen && (
          <div className='df-view-switcher-select__dropdown df-animate-in df-fade-in df-zoom-in-95'>
            <div className='df-view-switcher-select__list' role='listbox'>
              {registeredViews.map(viewType => (
                <button
                  type='button'
                  key={viewType}
                  onClick={() => {
                    calendar.changeView(viewType);
                    setIsOpen(false);
                    calendar.triggerRender();
                  }}
                  className='df-view-switcher-select__option'
                  data-active={currentView === viewType ? 'true' : 'false'}
                  role='option'
                  aria-selected={currentView === viewType}
                >
                  {getViewLabel(viewType, calendar, t)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className='df-view-switcher'>
      {registeredViews.map(viewType => (
        <button
          type='button'
          key={viewType}
          className='df-view-switcher__btn'
          data-active={currentView === viewType ? 'true' : 'false'}
          onClick={() => {
            calendar.changeView(viewType);
            calendar.triggerRender();
          }}
        >
          {getViewLabel(viewType, calendar, t)}
        </button>
      ))}
    </div>
  );
};

export default ViewSwitcher;
