import { h } from 'preact';
import { Event } from '@/types';
import { CalendarDays } from '../../common/Icons';
import {
  monthAllDayContent,
  mr1,
  eventIcon,
} from '@/styles/classNames';

interface MonthAllDayContentProps {
  event: Event;
  isEventSelected: boolean;
}

const MonthAllDayContent = ({
  event,
  isEventSelected,
}: MonthAllDayContentProps) => {
  const showIcon = event.icon !== false;
  const customIcon = typeof event.icon !== 'boolean' ? event.icon : null;

  return (
    <div className={monthAllDayContent}>
      {showIcon && (
        customIcon ? (
          <div className={`${mr1} shrink-0`}>{customIcon}</div>
        ) : (
          event.title.toLowerCase().includes('easter') ||
            event.title.toLowerCase().includes('holiday') ? (
            <span
              className={`inline-block ${mr1} shrink-0 ${isEventSelected ? 'text-yellow-200' : 'text-yellow-600'}`}
            >
              ⭐
            </span>
          ) : (
            <CalendarDays
              className={`${eventIcon} ${isEventSelected ? 'text-white' : ''}`}
            />
          )
        )
      )}
      <span className={`truncate ${isEventSelected ? 'text-white' : ''}`}>
        {event.title}
      </span>
    </div>
  );
};

export default MonthAllDayContent;
