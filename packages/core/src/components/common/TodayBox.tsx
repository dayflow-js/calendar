import { h } from 'preact';
import { ChevronLeft, ChevronRight } from './Icons';
import { useLocale } from '@/locale';
import {
  calendarNavButton,
  calendarTodayButton,
  navButtonIcon,
} from '@/styles/classNames';

interface Props {
  handlePreviousMonth: () => void;
  handleToday: () => void;
  handleNextMonth: () => void;
}

const TodayBox = ({
  handlePreviousMonth,
  handleToday,
  handleNextMonth,
}: Props) => {
  const { t } = useLocale();
  return (
    <div className="df-navigation flex items-center gap-1">
      <button
        className={calendarNavButton}
        onClick={handlePreviousMonth}
        aria-label="Previous month"
      >
        <ChevronLeft className={navButtonIcon} />
      </button>
      <button className={calendarTodayButton} onClick={handleToday}>
        {t('today')}
      </button>
      <button
        className={calendarNavButton}
        onClick={handleNextMonth}
        aria-label="Next month"
      >
        <ChevronRight className={navButtonIcon} />
      </button>
    </div>
  );
};

export default TodayBox;
