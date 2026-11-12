import { useLocale } from '@/locale';
import type { TranslationKey } from '@/locale/types';
import { calendarNavButton, calendarTodayButton } from '@/styles/classNames';

import { ChevronLeft, ChevronRight } from './Icons';

/** The unit the previous/next arrows move by; drives their accessible names. */
export type NavigationUnit = 'day' | 'week' | 'month' | 'year' | 'period';

const NAV_LABEL_KEYS: Record<
  NavigationUnit,
  { previous: TranslationKey; next: TranslationKey }
> = {
  day: { previous: 'previousDay', next: 'nextDay' },
  week: { previous: 'previousWeek', next: 'nextWeek' },
  month: { previous: 'previousMonth', next: 'nextMonth' },
  year: { previous: 'previousYear', next: 'nextYear' },
  period: { previous: 'previousPeriod', next: 'nextPeriod' },
};

interface Props {
  handlePreviousMonth: () => void;
  handleToday: () => void;
  handleNextMonth: () => void;
  navigationUnit?: NavigationUnit;
}

const TodayBox = ({
  handlePreviousMonth,
  handleToday,
  handleNextMonth,
  navigationUnit = 'period',
}: Props) => {
  const { t } = useLocale();
  const labelKeys = NAV_LABEL_KEYS[navigationUnit];
  return (
    <div className='df-navigation'>
      <button
        type='button'
        className={calendarNavButton}
        onClick={handlePreviousMonth}
        aria-label={t(labelKeys.previous)}
      >
        <ChevronLeft />
      </button>
      <button
        type='button'
        className={calendarTodayButton}
        onClick={handleToday}
      >
        {t('today')}
      </button>
      <button
        type='button'
        className={calendarNavButton}
        onClick={handleNextMonth}
        aria-label={t(labelKeys.next)}
      >
        <ChevronRight />
      </button>
    </div>
  );
};

export default TodayBox;
