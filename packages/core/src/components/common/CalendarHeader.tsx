import { JSX } from 'preact';
import { useContext, useCallback, useMemo } from 'preact/hooks';

import { useResponsiveMonthConfig } from '@/hooks/virtualScroll';
import { useLocale } from '@/locale/useLocale';
import { ContentSlot } from '@/renderer/ContentSlot';
import { CustomRenderingContext } from '@/renderer/CustomRenderingContext';
import { iconButton, searchInput, textGray500 } from '@/styles/classNames';
import { ViewType, CalendarHeaderProps } from '@/types';

import { Plus, Search } from './Icons';
import ViewSwitcher from './ViewSwitcher';

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

  const handleSearchChange = useCallback(
    (e: JSX.TargetedEvent<HTMLInputElement, Event>) => {
      const newValue = e.currentTarget.value;
      if (newValue !== searchValue) {
        onSearchChange?.(newValue);
      }
    },
    [onSearchChange, searchValue]
  );

  const handleClearSearch = () => {
    onSearchChange?.('');
  };

  // Stable object so ContentSlot's update effect does not fire on every
  // CalendarRoot re-render (app ticks, non-search state changes, etc.).
  const headerProps = useMemo(
    () => ({
      calendar,
      switcherMode,
      onAddCalendar,
      onSearchChange,
      onSearchClick,
      searchValue,
      isSearchOpen,
      isEditable,
      safeAreaLeft,
    }),
    [
      calendar,
      switcherMode,
      onAddCalendar,
      onSearchChange,
      onSearchClick,
      searchValue,
      isSearchOpen,
      isEditable,
      safeAreaLeft,
    ]
  );

  return (
    <ContentSlot
      store={customRenderingStore}
      generatorName='headerContent'
      generatorArgs={headerProps}
      defaultContent={
        <div
          className={`df-header flex shrink-0 items-center justify-between border-b bg-white pt-1 pr-2 transition-colors duration-200 dark:bg-gray-900 ${
            isDayView || isSearchOpen
              ? 'border-gray-200 dark:border-gray-700'
              : 'border-transparent'
          }`}
          style={{
            paddingLeft: safeAreaLeft || 8,
            transition: 'padding-left 160ms ease-in-out',
          }}
          onContextMenu={e => e.preventDefault()}
        >
          {/* Left Section: Add Calendar Button Only */}
          <div className='df-header-left mb-1 flex items-center'>
            {onAddCalendar && isEditable && (
              <button
                type='button'
                id='dayflow-add-event-btn'
                onClick={onAddCalendar}
                className={iconButton}
                title={
                  isMobile
                    ? t('newEvent') || 'New Event'
                    : t('createCalendar') || 'Add Calendar'
                }
              >
                <Plus className={`h-4 w-4 ${textGray500}`} />
              </button>
            )}
          </div>

          {/* Middle Section: ViewSwitcher (if mode is buttons) */}
          <div className='df-header-mid flex flex-1 justify-center'>
            {isSwitcherCentered && (
              <ViewSwitcher mode={switcherMode} calendar={calendar} />
            )}
          </div>

          {/* Right Section: Search, ViewSwitcher (if select) */}
          <div
            className={`df-header-right mb-1 flex items-center justify-end gap-3 pb-1`}
          >
            {!isSwitcherCentered && (
              <ViewSwitcher mode={switcherMode} calendar={calendar} />
            )}

            {/* Mobile Search Icon */}
            <button
              type='button'
              onClick={onSearchClick}
              className={`md:hidden ${iconButton}`}
              title={t('search') || 'Search'}
            >
              <Search width={16} height={16} />
            </button>

            {/* Desktop Search Bar */}
            <div className='group relative hidden md:block'>
              <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
                <span className='text-gray-400 transition-colors group-focus-within:text-primary'>
                  <Search width={16} height={16} />
                </span>
              </div>
              <input
                id='dayflow-search-input'
                type='text'
                placeholder={t('search') || 'Search'}
                value={searchValue}
                onChange={handleSearchChange}
                className={`${searchInput} w-48`}
              />
              {searchValue && (
                <button
                  type='button'
                  onClick={handleClearSearch}
                  className='absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                >
                  <svg
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <line x1='18' y1='6' x2='6' y2='18'></line>
                    <line x1='6' y1='6' x2='18' y2='18'></line>
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
