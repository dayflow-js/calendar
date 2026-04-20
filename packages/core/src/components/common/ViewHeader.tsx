import type { ComponentChild } from 'preact';

import { useLocale } from '@/locale';
import { headerTitle, headerSubtitle } from '@/styles/classNames';
import { ICalendarApp } from '@/types';

import TodayBox from './TodayBox';

export type ViewHeaderType = 'day' | 'week' | 'month' | 'year';
export type ViewSwitcherMode = 'buttons' | 'select';

interface ViewHeaderProps {
  calendar: ICalendarApp;
  /** View type */
  viewType: ViewHeaderType;
  /** Current date */
  currentDate: Date;
  /** Previous period */
  onPrevious?: () => void;
  /** Next period */
  onNext?: () => void;
  /** Go to today */
  onToday?: () => void;
  /** Custom title (optional, takes priority over default title) */
  customTitle?: string;
  /** Custom subtitle (optional, only for Day view) */
  customSubtitle?: string;
  /** Extra content rendered beside the subtitle row */
  subtitleMeta?: ComponentChild;
  /** Whether to show TodayBox (default determined by viewType: day=false, week/month=true) */
  showTodayBox?: boolean;
  /** Sticky year for Year view (optional, only for Year view) */
  stickyYear?: number | null;
  /** Push-away offset for sticky year (in pixels) */
  stickyYearOffset?: number;
  /** Next year that's pushing the sticky year (optional, only for Year view) */
  nextYear?: number | null;
  /** Offset for the next year coming from below (in pixels) */
  nextYearOffset?: number;
}

const ViewHeader = ({
  viewType,
  currentDate,
  onPrevious,
  onNext,
  onToday,
  customTitle,
  customSubtitle,
  subtitleMeta,
  showTodayBox,
  stickyYear,
  stickyYearOffset = 0,
  nextYear,
  nextYearOffset = 0,
}: ViewHeaderProps) => {
  const { locale } = useLocale();
  const shouldShowTodayBox = showTodayBox === undefined ? true : showTodayBox;

  const getDefaultTitle = (): string => {
    switch (viewType) {
      case 'day':
        return currentDate.toLocaleDateString(locale, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      case 'week':
      case 'month':
        return currentDate.toLocaleDateString(locale, {
          month: 'long',
          year: 'numeric',
        });
      case 'year':
        return currentDate.getFullYear().toString();
      default:
        return '';
    }
  };

  const getDefaultSubtitle = (): string | null => {
    if (viewType === 'day') {
      return currentDate.toLocaleDateString(locale, {
        weekday: 'long',
      });
    }
    return null;
  };

  const title = customTitle || getDefaultTitle();
  const subtitle =
    viewType === 'day' ? customSubtitle || getDefaultSubtitle() : null;

  return (
    <div
      className='df-view-header-container'
      onContextMenu={e => e.preventDefault()}
    >
      <div className='df-view-header-title-area'>
        {viewType === 'year' && stickyYear ? (
          <div className='df-view-header-year-stack'>
            <h1
              className={`${headerTitle} df-view-header-year-title`}
              style={{
                transform: `translateY(-${stickyYearOffset}px)`,
              }}
            >
              {stickyYear}
            </h1>
            {nextYear && (
              <h1
                className={`${headerTitle} df-view-header-year-title`}
                style={{
                  transform: `translateY(${nextYearOffset}px)`,
                }}
              >
                {nextYear}
              </h1>
            )}
          </div>
        ) : (
          <div>
            <div className={headerTitle}>{title}</div>

            {subtitle && <div className={headerSubtitle}>{subtitle}</div>}
            {subtitleMeta && (
              <div className='df-view-header-subtitle-row'>
                {subtitleMeta && (
                  <div className='df-view-header-subtitle-meta'>
                    {subtitleMeta}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {shouldShowTodayBox && onPrevious && onNext && onToday && (
        <div className='df-view-header-nav'>
          <TodayBox
            handlePreviousMonth={onPrevious}
            handleNextMonth={onNext}
            handleToday={onToday}
          />
        </div>
      )}
    </div>
  );
};

export default ViewHeader;
