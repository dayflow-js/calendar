import { h } from 'preact';
import { Event } from '@/types';
import { CalendarDays } from '../../common/Icons';
import {
  eventIcon,
  eventTitleSmall,
  px1,
  resizeHandleLeft,
  resizeHandleRight,
} from '@/styles/classNames';

interface AllDayContentProps {
  event: Event;
  isEditable: boolean;
  onResizeStart?: (e: any | any, event: Event, direction: string) => void;
}

const AllDayContent = ({
  event,
  isEditable,
  onResizeStart,
}: AllDayContentProps) => {
  const showIcon = event.icon !== false;
  const customIcon = typeof event.icon !== 'boolean' ? event.icon : null;

  return (
    <div
      className={`h-full flex items-center overflow-hidden pl-3 ${px1} py-0 relative group`}
    >
      {/* Left resize handle - only shown for single-day all-day events with onResizeStart */}
      {onResizeStart && isEditable && (
        <div
          className={resizeHandleLeft}
          onMouseDown={e => {
            e.preventDefault();
            e.stopPropagation();
            onResizeStart(e, event, 'left');
          }}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}

      {showIcon &&
        (customIcon ? (
          <div className="mr-1 shrink-0">{customIcon}</div>
        ) : (
          <CalendarDays className={eventIcon} />
        ))}
      <div className={`${eventTitleSmall} pr-1`} style={{ lineHeight: '1.2' }}>
        {event.title}
      </div>

      {/* Right resize handle - only shown for single-day all-day events with onResizeStart */}
      {onResizeStart && isEditable && (
        <div
          className={resizeHandleRight}
          onMouseDown={e => {
            e.preventDefault();
            e.stopPropagation();
            onResizeStart(e, event, 'right');
          }}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}
    </div>
  );
};

export default AllDayContent;
