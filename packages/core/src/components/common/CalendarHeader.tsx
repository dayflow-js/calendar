import { h } from 'preact';
import { useContext, useCallback } from 'preact/hooks';
import { ViewType, CalendarHeaderProps } from '../../types';
import ViewSwitcher from './ViewSwitcher';
import { Plus, Search } from './Icons';
import { useResponsiveMonthConfig } from '../../hooks/virtualScroll';
import { useLocale } from '../../locale/useLocale';
import { iconButton, searchInput, textGray500 } from '../../styles/classNames';
import { ContentSlot } from '../../renderer/ContentSlot';
import { CustomRenderingContext } from '../../renderer/CustomRenderingContext';

const CalendarHeader = ({
  calendar,
  switcherMode = 'buttons',
  onAddCalendar,
  onSearchChange,
  onSearchClick,
  searchValue = '',
  isSearchOpen = false,
  isEditable = true,
  safeAreaLeft,
}: CalendarHeaderProps) => {
  const customRenderingStore = useContext(CustomRenderingContext);
  const isSwitcherCentered = switcherMode === 'buttons';
  const isDayView = calendar.state.currentView === ViewType.DAY;
  const { screenSize } = useResponsiveMonthConfig();
  const isMobile = screenSize === 'mobile';
  const { t } = useLocale();

  const handleSearchChange = useCallback((e: any) => {
    const newValue = e.target.value;
    if (newValue !== searchValue) {
      onSearchChange?.(newValue);
    }
  }, [onSearchChange, searchValue]);

  const handleClearSearch = () => {
    onSearchChange?.('');
  };

  const headerProps = {
    calendar,
    switcherMode,
    onAddCalendar,
    onSearchChange,
    onSearchClick,
    searchValue,
    isSearchOpen,
    isEditable,
    safeAreaLeft,
  };

  return (
    <ContentSlot
      store={customRenderingStore}
      generatorName="headerContent"
      generatorArgs={headerProps}
      defaultContent={
        <div
          className={`df-header flex items-center justify-between pr-2 pt-1 bg-white dark:bg-gray-900 transition-colors duration-200 shrink-0 border-b ${isDayView || isSearchOpen
            ? 'border-gray-200 dark:border-gray-700'
            : 'border-transparent'
            }`}
          style={{ paddingLeft: safeAreaLeft || 8, transition: 'padding-left 160ms ease-in-out' }}
          onContextMenu={e => e.preventDefault()}
        >
          {/* Left Section: Add Calendar Button Only */}
          <div className="flex items-center mb-1">
            {onAddCalendar && isEditable && (
              <button
                id="dayflow-add-event-btn"
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
          <div className={`flex ${switcherMode === 'select' ? 'ml-2' : ''} items-center justify-end gap-3 mb-1 pb-1 h-6`}>
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
                id="dayflow-search-input"
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
      }
    />
  );
};

export default CalendarHeader;
