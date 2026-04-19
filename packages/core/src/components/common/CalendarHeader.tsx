import { JSX } from 'preact';
import { useCallback } from 'preact/hooks';

import { useResponsiveMonthConfig } from '@/hooks/virtualScroll';
import { useLocale } from '@/locale/useLocale';
import { iconButton } from '@/styles/classNames';
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

  const isBordered = isDayView || isSearchOpen;

  return (
    <div
      className='df-header'
      data-bordered={isBordered ? 'true' : 'false'}
      style={{
        paddingLeft: safeAreaLeft || 8,
        transition: 'padding-left 160ms ease-in-out',
      }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Left Section: Add Calendar Button Only */}
      <div className='df-header-left'>
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
            <Plus />
          </button>
        )}
      </div>

      {/* Middle Section: ViewSwitcher (if mode is buttons) */}
      <div className='df-header-mid'>
        {isSwitcherCentered && (
          <ViewSwitcher mode={switcherMode} calendar={calendar} />
        )}
      </div>

      {/* Right Section: Search, ViewSwitcher (if select) */}
      <div className='df-header-right'>
        {!isSwitcherCentered && (
          <ViewSwitcher mode={switcherMode} calendar={calendar} />
        )}

        {isMobile ? (
          /* Mobile: search icon only */
          <button
            type='button'
            onClick={onSearchClick}
            className={iconButton}
            title={t('search') || 'Search'}
          >
            <Search />
          </button>
        ) : (
          /* Desktop: inline search bar */
          <div className='df-search-group'>
            <div className='df-search-group-icon'>
              <Search width={16} height={16} />
            </div>
            <input
              id='dayflow-search-input'
              type='text'
              placeholder={t('search') || 'Search'}
              value={searchValue}
              onChange={handleSearchChange}
              className='df-search-group-input'
              style={{ width: '12rem' }}
            />
            {searchValue && (
              <button
                type='button'
                onClick={handleClearSearch}
                className='df-search-group-clear'
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
        )}
      </div>
    </div>
  );
};

export default CalendarHeader;
