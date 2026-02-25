import { getEventIcon } from '@/components/monthView/util';
import { YearMultiDaySegment } from '@/components/yearView/utils';
import { Event } from '@/types';
import { getLineColor } from '@/utils';

interface YearEventContentProps {
  event: Event;
  segment: YearMultiDaySegment;
  isEditable: boolean;
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
        className={`resize-handle absolute ${isLeft ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20`}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(e as MouseEvent, event, isLeft ? 'left' : 'right');
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
        <div className='df-year-event-content flex items-center min-w-0 w-full pointer-events-auto h-full'>
          {segment.isFirstSegment && getEventIcon(event) && (
            <div className='df-year-event-icon shrink-0 mr-1'>
              <div
                className='rounded-full p-0.5 text-white flex items-center justify-center'
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

          <div className='flex-1 min-w-0'>
            <div
              className='df-year-event-title text-[12px] leading-none whitespace-nowrap overflow-hidden'
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
            <div className='shrink-0 ml-1 text-white/80 dark:text-white/90'>
              <div className='w-1.5 h-1.5 rounded-full bg-white/60 dark:bg-white/80'></div>
            </div>
          )}
        </div>
      );
    }

    // For non-all-day events treated as bars in Year View
    const titleText = segment.isFirstSegment ? event.title : '';

    return (
      <div className='df-year-event-content w-full h-full flex items-center overflow-hidden gap-1 pointer-events-auto'>
        {!isAllDay && (
          <span
            style={{ backgroundColor: lineColor }}
            className='df-year-event-indicator inline-block w-0.75 h-3 shrink-0 rounded-full'
          ></span>
        )}
        {isAllDay && icon && (
          <div className='df-year-event-icon shrink-0 flex items-center justify-center opacity-80 scale-75'>
            {icon}
          </div>
        )}
        <span
          className='df-year-event-title w-full block font-medium whitespace-nowrap overflow-hidden leading-none text-[12px]'
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
