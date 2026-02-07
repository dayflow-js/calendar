import React from 'react';
import TodayBox from './TodayBox';
import {
  headerContainer,
  headerTitle,
  headerSubtitle,
  textGray900,
} from '../../styles/classNames';
import { CalendarApp } from '../../types';
import { useLocale } from '@/locale';

export type ViewHeaderType = 'day' | 'week' | 'month' | 'year';
export type ViewSwitcherMode = 'buttons' | 'select';

interface ViewHeaderProps {
  calendar: CalendarApp;
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

const ViewHeader: React.FC<ViewHeaderProps> = ({
  viewType,
  currentDate,
  onPrevious,
  onNext,
  onToday,
  customTitle,
  customSubtitle,
  showTodayBox,
  stickyYear,
  stickyYearOffset = 0,
  nextYear,
  nextYearOffset = 0,
}) => {
  const { locale } = useLocale();
  // Determine whether to show TodayBox based on view type
  // Default: show for all views if callbacks are provided, unless explicitly set to false
  const shouldShowTodayBox = showTodayBox !== undefined ? showTodayBox : true;

  // Generate default title
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

  // Generate default subtitle (only for Day view)
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
    <div className={headerContainer} style={{ position: 'relative' }} onContextMenu={e => e.preventDefault()}>
      <div className="flex-1">
        {/* For Year view: show sticky year if available, otherwise show title */}
        {viewType === 'year' && stickyYear ? (
          <div style={{ position: 'relative', overflow: 'hidden', height: '1.5em' }}>
            {/* Current sticky year - being pushed up */}
            <h1
              className={headerTitle}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `translateY(-${stickyYearOffset}px)`,
                willChange: 'transform',
              }}
            >
              {stickyYear}
            </h1>
            {/* Next year - coming from below */}
            {nextYear && (
              <h1
                className={headerTitle}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `translateY(${nextYearOffset}px)`,
                  willChange: 'transform',
                }}
              >
                {nextYear}
              </h1>
            )}
          </div>
        ) : (
          <div>
            <div className={`${headerTitle} ${textGray900}`}>{title}</div>
            {subtitle && <div className={headerSubtitle}>{subtitle}</div>}
          </div>
        )}
      </div>

      {/* Right side: TodayBox */}
      {shouldShowTodayBox && onPrevious && onNext && onToday && (
        <div className="flex items-center gap-2">
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
