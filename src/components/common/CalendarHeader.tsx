import React from 'react';
import { ViewType, CalendarHeaderProps } from '../../types';
import ViewSwitcher from './ViewSwitcher';
import { Plus, Search } from 'lucide-react';
import { useResponsiveMonthConfig } from '../../hooks/virtualScroll';
import { useLocale } from '../../locale/useLocale';
import { iconButton, searchInput, textGray500 } from '../../styles/classNames';

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  calendar,
  switcherMode = 'buttons',
  onAddCalendar,
  onSearchChange,
  onSearchClick,
  searchValue = '',
  isSearchOpen = false,
  isEditable = true,
}) => {
  const isSwitcherCentered = switcherMode === 'buttons';
  const isDayView = calendar.state.currentView === ViewType.DAY;
  const { screenSize } = useResponsiveMonthConfig();
  const isMobile = screenSize === 'mobile';
  const { t } = useLocale();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(e.target.value);
  };

  const handleClearSearch = () => {
    onSearchChange?.('');
  };

  return (
    <div
      className={`flex items-center justify-between px-2 pt-1 bg-white dark:bg-gray-900 transition-colors duration-200 shrink-0 border-b ${isDayView || isSearchOpen
        ? 'border-gray-200 dark:border-gray-700'
        : 'border-transparent'
        }`}
    >
      {/* Left Section: Add Calendar Button Only */}
      <div className="flex flex-1 items-center mb-1">
        {onAddCalendar && isEditable && (
          <button
            onClick={onAddCalendar}
            className={iconButton}
            title={isMobile ? (t('newEvent') || 'New Event') : (t('createCalendar') || 'Add Calendar')}
          >
            <Plus className={`h-4 w-4 ${textGray500}`} />
          </button>
        )}
      </div>

      {/* Middle Section: ViewSwitcher (if mode is buttons) */}
      <div className="flex-1 flex justify-center">
        {isSwitcherCentered && (
          <ViewSwitcher mode={switcherMode} calendar={calendar} />
        )}
      </div>

      {/* Right Section: Search, ViewSwitcher (if select) */}
      {!isSwitcherCentered && (
        <ViewSwitcher mode={switcherMode} calendar={calendar} />
      )}
      <div className={`flex ${switcherMode === 'select' ? 'ml-2' : 'flex-1'} items-center justify-end gap-3 mb-1 pb-1 h-6`}>
        {/* Mobile Search Icon */}
        <button
          onClick={onSearchClick}
          className={`md:hidden ${iconButton}`}
        >
          <Search width={16} height={16} />
        </button>

        {/* Desktop Search Bar */}
        <div className="relative hidden md:block group mt-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400 group-focus-within:text-primary transition-colors">
              <Search width={16} height={16} />
            </span>
          </div>
          <input
            type="text"
            placeholder="Search"
            value={searchValue}
            onChange={handleSearchChange}
            className={`${searchInput} w-48`}
          />
          {searchValue && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
