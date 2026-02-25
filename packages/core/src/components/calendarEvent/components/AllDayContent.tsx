import { CalendarDays } from '@/components/common/Icons';
import { MultiDayEventSegment } from '@/components/monthView/WeekComponent';
import {
  eventIcon,
  eventTitleSmall,
  px1,
  resizeHandleLeft,
  resizeHandleRight,
} from '@/styles/classNames';
import { Event, ViewMode } from '@/types';

interface AllDayContentProps {
  event: Event;
  isEditable: boolean;
  onResizeStart?: (e: MouseEvent, event: Event, direction: string) => void;
  isMultiDay?: boolean;
  segment?: MultiDayEventSegment;
  mode?: ViewMode;
  isCompact?: boolean;
}

const AllDayContent = ({
  event,
  isEditable,
  onResizeStart,
  isMultiDay,
  segment,
  mode = 'standard',
  isCompact,
}: AllDayContentProps) => {
  const showIcon = event.icon !== false;
  const customIcon = typeof event.icon === 'boolean' ? null : event.icon;

  // Calculate title offset for mobile 2-column mode
  const titleOffsetStyle = (() => {
    if ((mode !== 'compact' && !isCompact) || !isMultiDay || !segment)
      return {};
    // The current visible window starts at index 2 of the 6-day range
    const visibleStartIndex = 2;
    // If the event starts before the visible window but ends within or after it
    if (
      segment.startDayIndex < visibleStartIndex &&
      segment.endDayIndex >= visibleStartIndex
    ) {
      const offsetDays = visibleStartIndex - segment.startDayIndex;
      const spanDays = segment.endDayIndex - segment.startDayIndex + 1;

      // Calculate offset as a percentage of the event bar's width
      const offsetPercent = (offsetDays / spanDays) * 100;

      return {
        paddingLeft: `calc(${offsetPercent}% + 0.75rem)`,
        // Ensure the transition matches the swipe transition for a smooth effect
        // transition: 'padding-left 0.3s ease-out',
      };
    }
    return {};
  })();

  return (
    <div
      className={`h-full flex items-center overflow-hidden pl-3 ${px1} py-0 relative group`}
      style={titleOffsetStyle}
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
          <div className='mr-1 shrink-0'>{customIcon}</div>
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
