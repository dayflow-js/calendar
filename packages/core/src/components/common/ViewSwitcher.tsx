import { useState, useRef, useEffect } from 'preact/hooks';

import { useLocale } from '@/locale';
import { TranslationKey } from '@/locale/types';
import { dropdownPanel, textGray500 } from '@/styles/classNames';
import { ICalendarApp } from '@/types';

import { ChevronDown } from './Icons';

interface ViewSwitcherProps {
  calendar: ICalendarApp;
  mode?: 'buttons' | 'select';
}

const ViewSwitcher = ({ calendar, mode = 'buttons' }: ViewSwitcherProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useLocale();

  // Get all registered views
  const registeredViews = Array.from(calendar.state.views.keys());
  const currentView = calendar.state.currentView;

  // Close dropdown when clicking outside
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

  // If there's only one view (or none), no need to show the switcher
  if (registeredViews.length <= 1) {
    return null;
  }

  if (mode === 'select') {
    return (
      <div className='relative inline-block' ref={dropdownRef}>
        <button
          type='button'
          onClick={() => setIsOpen(!isOpen)}
          className='flex h-7 min-w-30 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:bg-gray-50 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700'
          aria-expanded={isOpen}
          aria-haspopup='listbox'
        >
          <span className='text-gray-900 dark:text-gray-100'>
            {t(currentView as TranslationKey)}
          </span>
          <span
            className={`${textGray500} transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          >
            <ChevronDown width={16} height={16} />
          </span>
        </button>

        {isOpen && (
          <div
            className={`absolute top-full left-0 z-50 mt-1 w-full min-w-30 ${dropdownPanel} animate-in`}
          >
            <div className='p-1' role='listbox'>
              {registeredViews.map(viewType => (
                <button
                  type='button'
                  key={viewType}
                  onClick={() => {
                    calendar.changeView(viewType);
                    setIsOpen(false);
                    // Force update might be needed if not handled by app subscribe
                    calendar.triggerRender();
                  }}
                  className={`w-full rounded px-3 py-0.5 text-left text-sm transition-colors duration-150 focus:outline-none ${
                    currentView === viewType
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                  role='option'
                  aria-selected={currentView === viewType}
                >
                  {t(viewType as TranslationKey)}
                </button>
              ))}
            </div>
          </div>
        )}

        <style>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-4px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-in {
            animation: slideIn 0.15s ease-out;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className='mb-1 inline-flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800'>
      {registeredViews.map(viewType => (
        <button
          type='button'
          key={viewType}
          className={`h-6 rounded-md px-4 text-sm font-medium transition-all duration-200 focus:outline-none ${
            currentView === viewType
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100'
          }`}
          onClick={() => {
            calendar.changeView(viewType);
            calendar.triggerRender();
          }}
        >
          {t(viewType as TranslationKey)}
        </button>
      ))}
    </div>
  );
};

export default ViewSwitcher;
