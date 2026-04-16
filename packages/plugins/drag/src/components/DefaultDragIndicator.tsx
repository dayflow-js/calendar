import {
  DragIndicatorRenderer,
  buildDiagonalPatternBackground,
} from '@dayflow/core';

const eventColorBar =
  'df-event-color-bar absolute left-1 top-1 bottom-1 w-[3px] rounded-full';
const colorBarClipPath =
  'inset(0.25rem calc(100% - 0.25rem - 3px) 0.25rem 0.25rem round 9999px)';

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
    <path d='M8 2v4' />
    <path d='M16 2v4' />
    <rect width='18' height='18' x='3' y='4' rx='2' />
    <path d='M3 10h18' />
    <path d='M8 14h.01' />
    <path d='M12 14h.01' />
    <path d='M16 14h.01' />
    <path d='M8 18h.01' />
    <path d='M12 18h.01' />
    <path d='M16 18h.01' />
  </svg>
);

export const DefaultDragIndicatorRenderer: DragIndicatorRenderer = {
  renderAllDayContent: ({
    title,
    color: _color,
    isMobile,
    isLightBackground,
  }) => {
    const iconClass = isLightBackground
      ? 'mr-1 h-3 w-3'
      : 'mr-1 h-3 w-3 text-white';
    const textClass = isLightBackground
      ? 'pr-1 text-xs font-medium'
      : 'pr-1 text-xs font-medium text-white';
    return (
      <div className='flex h-full items-center overflow-hidden pl-3'>
        <CalendarDaysIcon className={iconClass} />
        <div
          className={`${textClass} ${isMobile ? 'df-mobile-mask-fade' : 'truncate'}`}
          style={
            isMobile
              ? {
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }
              : undefined
          }
        >
          {title}
        </div>
      </div>
    );
  },

  renderRegularContent: ({
    drag,
    title,
    layout: _layout,
    formatTime,
    getLineColor,
    getDynamicPadding,
    color,
    isMobile,
    isLightBackground,
    calendarLineColors,
  }) => {
    const textClass = isLightBackground ? '' : 'text-white';
    const timeTextClass = isLightBackground
      ? 'opacity-70'
      : 'text-white opacity-90';
    const lineColors =
      calendarLineColors && calendarLineColors.length > 0
        ? calendarLineColors
        : [getLineColor(color || 'blue')];
    const colorBarValue = buildDiagonalPatternBackground(lineColors);
    const colorBarContent =
      lineColors.length > 1 ? (
        <div
          className='df-event-color-bar pointer-events-none absolute inset-0'
          style={{
            background: colorBarValue,
            clipPath: colorBarClipPath,
          }}
        />
      ) : (
        <div
          className={eventColorBar}
          style={{ backgroundColor: colorBarValue }}
        />
      );
    return (
      <>
        {colorBarContent}
        <div
          className={`flex h-full flex-col overflow-hidden pl-3 ${textClass} ${getDynamicPadding(drag)}`}
        >
          <div
            className={`pr-1 text-xs font-medium ${textClass} ${isMobile ? 'df-mobile-mask-fade' : 'truncate'}`}
            style={{
              lineHeight:
                drag.endHour - drag.startHour <= 0.25 ? '1.2' : 'normal',
              ...(isMobile
                ? {
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }
                : {}),
            }}
          >
            {title}
          </div>
          {!drag.allDay && drag.endHour - drag.startHour > 0.5 && (
            <div className={`time-display truncate text-xs ${timeTextClass}`}>
              {formatTime(drag.startHour)} - {formatTime(drag.endHour)}
            </div>
          )}
        </div>
        {isMobile && (
          <>
            <div
              className='absolute -top-1.5 right-5 z-50 h-2.5 w-2.5 rounded-full border-2 bg-white'
              style={{ borderColor: lineColors[0] || getLineColor('blue') }}
            />
            <div
              className='absolute -bottom-1.5 left-5 z-50 h-2.5 w-2.5 rounded-full border-2 bg-white'
              style={{ borderColor: lineColors[0] || getLineColor('blue') }}
            />
          </>
        )}
      </>
    );
  },

  renderDefaultContent: ({ drag: _drag, title, allDay, isMobile }) => {
    if (allDay) {
      return (
        <div className='flex h-full items-center overflow-hidden px-1 py-0 pl-3'>
          <CalendarDaysIcon className='mr-1 h-3 w-3' />
          <div
            className={`pr-1 text-xs font-medium ${isMobile ? 'df-mobile-mask-fade' : 'truncate'}`}
            style={{
              lineHeight: 1.2,
              ...(isMobile
                ? {
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }
                : {}),
            }}
          >
            {title}
          </div>
        </div>
      );
    }

    return (
      <>
        <div className='df-fill-primary absolute top-1 bottom-1 left-0.5 w-0.5 rounded-full' />
        <div className='flex h-full flex-col overflow-hidden p-1 pl-3'>
          <div
            className={`df-text-primary pr-1 text-xs font-medium ${isMobile ? 'df-mobile-mask-fade' : 'truncate'}`}
            style={
              isMobile
                ? {
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }
                : undefined
            }
          >
            {title}
          </div>
        </div>
      </>
    );
  },
};
