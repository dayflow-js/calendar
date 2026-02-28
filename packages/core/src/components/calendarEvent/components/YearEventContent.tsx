import { getEventIcon } from '@/components/monthView/util';
import { YearMultiDaySegment } from '@/components/yearView/utils';
import { Event } from '@/types';
import { getLineColor } from '@/utils';

interface YearEventContentProps {
  event: Event;
  segment: YearMultiDaySegment;
  isEditable: boolean;
  onMoveStart?: (e: MouseEvent | TouchEvent, event: Event) => void;
  onResizeStart?: (
    e: MouseEvent | TouchEvent,
    event: Event,
    direction: string
  ) => void;
}

const YearEventContent = ({
  event,
  segment,
  isEditable,
  onMoveStart,
  onResizeStart,
}: YearEventContentProps) => {
  const isAllDay = !!event.allDay;
  const calendarId = event.calendarId || 'blue';
  const lineColor = getLineColor(calendarId);
  const icon = isAllDay ? getEventIcon(event) : null;
  const { isFirstSegment, isLastSegment } = segment;

  const renderResizeHandle = (position: 'left' | 'right') => {
    const isLeft = position === 'left';
    const shouldShow = isLeft ? isFirstSegment : isLastSegment;

    // Only allow resizing for all-day events in Year View
    if (!event.allDay || !shouldShow || !onResizeStart || !isEditable)
      return null;

    return (
      <div
        className={`resize-handle absolute ${isLeft ? 'left-0' : 'right-0'} top-0 bottom-0 z-20 w-1 cursor-ew-resize opacity-0 transition-opacity group-hover:opacity-100`}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(e as MouseEvent, event, isLeft ? 'left' : 'right');
        }}
        onTouchStart={e => {
          e.stopPropagation();
          onResizeStart(e as TouchEvent, event, isLeft ? 'left' : 'right');
        }}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    );
  };

  const renderContent = () => {
    if (isAllDay) {
      const getDisplayText = () => {
        if (segment.isFirstSegment) return event.title;
        return '···';
      };

      return (
        <div
          className='df-year-event-content pointer-events-auto flex h-full w-full min-w-0 items-center'
          onMouseDown={e => {
            if (onMoveStart) {
              e.stopPropagation();
              onMoveStart(e as MouseEvent, event);
            }
          }}
        >
          {segment.isFirstSegment && getEventIcon(event) && (
            <div className='df-year-event-icon mr-1 shrink-0'>
              <div
                className='flex items-center justify-center rounded-full p-0.5 text-white'
                style={{
                  backgroundColor: getLineColor(calendarId),
                  width: '12px',
                  height: '12px',
                }}
              >
                {getEventIcon(event)}
              </div>
            </div>
          )}

          <div className='min-w-0 flex-1'>
            <div
              className='df-year-event-title overflow-hidden text-[12px] leading-none whitespace-nowrap'
              style={{
                maskImage:
                  'linear-gradient(to right, black 70%, transparent 100%)',
                WebkitMaskImage:
                  'linear-gradient(to right, black 70%, transparent 100%)',
              }}
            >
              {getDisplayText()}
            </div>
          </div>

          {/* Add small indicator for continuation if needed, similar to MultiDayEvent */}
          {segment.isLastSegment && !segment.isFirstSegment && (
            <div className='ml-1 shrink-0 text-white/80 dark:text-white/90'>
              <div className='h-1.5 w-1.5 rounded-full bg-white/60 dark:bg-white/80'></div>
            </div>
          )}
        </div>
      );
    }

    // For non-all-day events treated as bars in Year View
    const titleText = segment.isFirstSegment ? event.title : '';

    return (
      <div
        className='df-year-event-content pointer-events-auto flex h-full w-full items-center gap-1 overflow-hidden'
        onMouseDown={e => {
          if (onMoveStart) {
            e.stopPropagation();
            onMoveStart(e as MouseEvent, event);
          }
        }}
      >
        {!isAllDay && (
          <span
            style={{ backgroundColor: lineColor }}
            className='df-year-event-indicator inline-block h-3 w-0.75 shrink-0 rounded-full'
          ></span>
        )}
        {isAllDay && icon && (
          <div className='df-year-event-icon flex shrink-0 scale-75 items-center justify-center opacity-80'>
            {icon}
          </div>
        )}
        <span
          className='df-year-event-title block w-full overflow-hidden text-[12px] leading-none font-medium whitespace-nowrap'
          style={{
            maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to right, black 70%, transparent 100%)',
          }}
        >
          {titleText}
        </span>
      </div>
    );
  };

  return (
    <>
      {renderResizeHandle('left')}
      {renderContent()}
      {renderResizeHandle('right')}
    </>
  );
};

export default YearEventContent;
