import { CalendarDays } from '@/components/common/Icons';
import { monthAllDayContent, eventIcon } from '@/styles/classNames';
import { Event } from '@/types';

const mobileFadeStyle = {
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'clip',
  WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
  maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
} as const;

interface MonthAllDayContentProps {
  event: Event;
  isEventSelected: boolean;
  isMobile: boolean;
}

const MonthAllDayContent = ({
  event,
  isEventSelected: _isEventSelected,
  isMobile,
}: MonthAllDayContentProps) => {
  const showIcon = event.icon !== false;
  const customIcon = typeof event.icon === 'boolean' ? null : event.icon;

  return (
    <div className={monthAllDayContent}>
      {showIcon &&
        (customIcon ? (
          <div className='df-event-icon-slot'>{customIcon}</div>
        ) : event.title.toLowerCase().includes('easter') ||
          event.title.toLowerCase().includes('holiday') ? (
          <span className='df-event-holiday-icon'>⭐</span>
        ) : (
          <span className='df-event-icon-slot'>
            <CalendarDays className={eventIcon} />
          </span>
        ))}
      <span
        className={`df-event-month-title ${isMobile ? 'df-mobile-mask-fade' : ''}`}
        style={isMobile ? mobileFadeStyle : undefined}
      >
        {event.title}
      </span>
    </div>
  );
};

export default MonthAllDayContent;
