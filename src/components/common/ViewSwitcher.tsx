import React, { useState, useRef, useEffect } from 'react';
import { CalendarApp, ViewType } from '@/types';

interface ViewSwitcherProps {
  calendar: CalendarApp;
  mode?: 'buttons' | 'select';
}

const VIEW_LABELS: Record<ViewType, string> = {
  [ViewType.DAY]: 'Day',
  [ViewType.WEEK]: 'Week',
  [ViewType.MONTH]: 'Month',
  [ViewType.YEAR]: 'Year',
};

const ChevronDownIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="transition-transform duration-200"
  >
    <path
      d="M4 6L8 10L12 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  calendar,
  mode = 'buttons',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  if (mode === 'select') {
    return (
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1 text-sm font-medium border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 shadow-sm min-w-[120px] justify-between"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="text-gray-900 dark:text-gray-100">{VIEW_LABELS[currentView]}</span>
          <span
            className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          >
            <ChevronDownIcon />
          </span>
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1 left-0 z-50 w-full min-w-[120px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg dark:shadow-gray-900/50 overflow-hidden animate-in">
            <div className="py-1" role="listbox">
              {registeredViews.map(viewType => (
                <button
                  key={viewType}
                  onClick={() => {
                    calendar.changeView(viewType);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors duration-150 ${currentView === viewType
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  role="option"
                  aria-selected={currentView === viewType}
                >
                  {VIEW_LABELS[viewType]}
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
    <div className="inline-flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {registeredViews.map(viewType => (
        <button
          key={viewType}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${currentView === viewType
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          onClick={() => calendar.changeView(viewType)}
        >
          {VIEW_LABELS[viewType]}
        </button>
      ))}
    </div>
  );
};

export default ViewSwitcher;
