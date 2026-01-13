import React from 'react';
import TodayBox from './TodayBox';
import {
  headerContainer,
  headerTitle,
  headerSubtitle,
  textGray900,
} from '../../styles/classNames';
import ViewSwitcher from './ViewSwitcher';
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
  /** ViewSwitcher mode (default: 'select') */
  switcherMode?: ViewSwitcherMode;
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
  calendar,
  viewType,
  currentDate,
  onPrevious,
  onNext,
  onToday,
  customTitle,
  customSubtitle,
  showTodayBox,
  switcherMode = 'buttons',
  stickyYear,
  stickyYearOffset = 0,
  nextYear,
  nextYearOffset = 0,
}) => {
  const { locale } = useLocale();
  // Determine whether to show TodayBox based on view type
  const shouldShowTodayBox =
    showTodayBox !== undefined ? showTodayBox : viewType !== 'day';

  const isSwitcherCentered = switcherMode === 'buttons';

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

  // Day view layout (in the 70% width left panel)
  if (viewType === 'day') {
    return (
      <div className={headerContainer} style={{ position: 'relative' }}>
        <div className="flex-1 mb-px">
          <div className={`${headerTitle} ${textGray900}`}>{title}</div>
          {subtitle && <div className={headerSubtitle}>{subtitle}</div>}
        </div>

        {/* ViewSwitcher centered relative to the entire page (71.43% position in 70% container = 50% page position)
        Total page width = 100%
        DayView left container = 70%
        Week/Month ViewSwitcher position = 50% (page center)

        To reach 50% page position in 70% container:
        50% ÷ 70% = 5/7 ≈ 71.43% + 0.5px(DayView Right content border) */}
        {isSwitcherCentered && (
          <div
            className="absolute -translate-x-1/2"
            style={{ left: 'calc(5 / 7 * 100% + 0.5px)' }}
          >
            <ViewSwitcher mode={switcherMode} calendar={calendar} />
          </div>
        )}

        {/* ViewSwitcher in select mode: show on the local right */}
        {!isSwitcherCentered && (
          <div className="flex items-center gap-2">
            {shouldShowTodayBox && onPrevious && onNext && onToday && (
              <TodayBox
                handlePreviousMonth={onPrevious}
                handleNextMonth={onNext}
                handleToday={onToday}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // Week/Month/Year view layout
  return (
    <div className={headerContainer} style={{ position: 'relative' }}>
      <div>
        {/* For Year view: show sticky year if available, otherwise show title */}
        {viewType === 'year' && stickyYear ? (
          <div style={{ position: 'relative', overflow: 'hidden' }}>
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
          <h1 className={headerTitle}>{title}</h1>
        )}
      </div>

      {/* buttons mode: center display */}
      {isSwitcherCentered && (
        <div className="absolute left-1/2 -translate-x-1/2">
          <ViewSwitcher mode={switcherMode} calendar={calendar} />
        </div>
      )}

      {/* select mode or TodayBox: show on the right */}
      {(shouldShowTodayBox || !isSwitcherCentered) &&
        onPrevious &&
        onNext &&
        onToday && (
          <div className="flex items-center gap-2">
            {!isSwitcherCentered && (
              <ViewSwitcher mode={switcherMode} calendar={calendar} />
            )}
            {shouldShowTodayBox && (
              <TodayBox
                handlePreviousMonth={onPrevious}
                handleNextMonth={onNext}
                handleToday={onToday}
              />
            )}
          </div>
        )}
    </div>
  );
};

export default ViewHeader;
