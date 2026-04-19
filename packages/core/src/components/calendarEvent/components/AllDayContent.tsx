import { ComponentChildren } from 'preact';

import { CalendarDays } from '@/components/common/Icons';
import { MultiDayEventSegment } from '@/components/monthView/util';
import {
  eventIcon,
  eventTitleSmall,
  resizeHandleLeft,
  resizeHandleRight,
} from '@/styles/classNames';
import { Event } from '@/types';

interface AllDayContentProps {
  event: Event;
  isEditable: boolean;
  onResizeStart?: (e: MouseEvent, event: Event, direction: string) => void;
  isMultiDay?: boolean;
  segment?: MultiDayEventSegment;
  isSlidingView?: boolean;
  /** Optional slot renderer — receives the default inner content and wraps it in a ContentSlot */
  renderSlot?: (defaultContent: ComponentChildren) => ComponentChildren;
}

const AllDayContent = ({
  event,
  isEditable,
  onResizeStart,
  isMultiDay,
  segment,
  isSlidingView,
  renderSlot,
}: AllDayContentProps) => {
  const showIcon = event.icon !== false;
  const customIcon = typeof event.icon === 'boolean' ? null : event.icon;

  // Calculate title offset for mobile sliding mode
  const titleOffsetStyle = (() => {
    if (!isSlidingView || !isMultiDay || !segment) return {};

    // The current visible window starts at index 2 of the 3-page range
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

  const innerContent = (
    <div className='df-event-content-row'>
      {showIcon &&
        (customIcon ? (
          <div className='df-event-icon-slot'>{customIcon}</div>
        ) : (
          <span className='df-event-icon-slot'>
            <CalendarDays className={eventIcon} />
          </span>
        ))}
      <div className={`${eventTitleSmall} df-event-title-tight`}>
        {event.title}
      </div>
    </div>
  );

  return (
    <div className='df-event-all-day-shell' style={titleOffsetStyle}>
      {renderSlot ? renderSlot(innerContent) : innerContent}

      {/* Left/Right resize handles — absolute positioned, always rendered outside the slot */}
      {onResizeStart && isEditable && (
        <>
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
        </>
      )}
    </div>
  );
};

export default AllDayContent;
