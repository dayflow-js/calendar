import { DragIndicatorRenderer } from '@dayflow/core';

const eventColorBar =
  'df-event-color-bar absolute left-1 top-1 bottom-1 w-[3px] rounded-full';

const CalendarDaysIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    stroke-width='2'
    stroke-linecap='round'
    stroke-linejoin='round'
    className={className}
  >
    <rect width='18' height='18' x='3' y='4' rx='2' ry='2' />
    <line x1='16' x2='16' y1='2' y2='6' />
    <line x1='8' x2='8' y1='2' y2='6' />
    <line x1='3' x2='21' y1='10' y2='10' />
    <path d='M8 14h.01' />
    <path d='M12 14h.01' />
    <path d='M16 14h.01' />
    <path d='M8 18h.01' />
    <path d='M12 18h.01' />
    <path d='M16 18h.01' />
  </svg>
);

export const DefaultDragIndicatorRenderer: DragIndicatorRenderer = {
  renderAllDayContent: ({ title, color: _color }) => (
    <div className='h-full flex items-center overflow-hidden pl-3 pt-1'>
      <CalendarDaysIcon className='h-3 w-3 mr-1 text-white' />
      <div className='font-medium text-xs truncate pr-1 text-white'>
        {title}
      </div>
    </div>
  ),

  renderRegularContent: ({
    drag,
    title,
    layout: _layout,
    formatTime,
    getLineColor,
    getDynamicPadding,
    color,
    isMobile,
  }) => (
    <>
      <div
        className={eventColorBar}
        style={{ backgroundColor: getLineColor(color || 'blue') }}
      />
      <div
        className={`h-full flex flex-col overflow-hidden pl-3 text-white ${getDynamicPadding(drag)}`}
      >
        <div
          className='font-medium text-xs truncate pr-1 text-white'
          style={{
            lineHeight:
              drag.endHour - drag.startHour <= 0.25 ? '1.2' : 'normal',
          }}
        >
          {title}
        </div>
        {!drag.allDay && drag.endHour - drag.startHour > 0.5 && (
          <div className='text-xs truncate time-display text-white opacity-90'>
            {formatTime(drag.startHour)} - {formatTime(drag.endHour)}
          </div>
        )}
      </div>
      {isMobile && (
        <>
          <div
            className='absolute -top-1.5 right-5 w-2.5 h-2.5 bg-white border-2 rounded-full z-50'
            style={{ borderColor: getLineColor(color || 'blue') }}
          />
          <div
            className='absolute -bottom-1.5 left-5 w-2.5 h-2.5 bg-white border-2 rounded-full z-50'
            style={{ borderColor: getLineColor(color || 'blue') }}
          />
        </>
      )}
    </>
  ),

  renderDefaultContent: ({ drag: _drag, title, allDay }) => {
    if (allDay) {
      return (
        <div className='h-full flex items-center overflow-hidden pl-3 px-1 py-0'>
          <svg
            className='h-3 w-3 mr-1'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z'
            />
          </svg>
          <div
            className='font-medium text-xs truncate pr-1'
            style={{ lineHeight: 1.2 }}
          >
            {title}
          </div>
        </div>
      );
    }

    return (
      <>
        <div className='absolute left-0.5 top-1 bottom-1 w-0.5 rounded-full bg-primary' />
        <div className='h-full flex flex-col overflow-hidden pl-3 p-1'>
          <div className='font-medium text-xs truncate pr-1 text-primary'>
            {title}
          </div>
        </div>
      </>
    );
  },
};
