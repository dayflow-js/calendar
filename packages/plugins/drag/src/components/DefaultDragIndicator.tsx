import {
  DragIndicatorRenderer,
  buildDiagonalPatternBackground,
} from '@dayflow/core';

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
  }) => (
    <div className='df-drag-indicator-all-day'>
      <CalendarDaysIcon
        className='df-drag-indicator-icon'
        data-light={isLightBackground}
      />
      <div
        className={`df-event-title df-event-title-tight ${isMobile ? 'df-mobile-mask-fade' : ''}`}
        data-light={isLightBackground}
      >
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
    isLightBackground,
    calendarLineColors,
  }) => {
    const lineColors =
      calendarLineColors && calendarLineColors.length > 0
        ? calendarLineColors
        : [getLineColor(color || 'blue')];
    const colorBarValue = buildDiagonalPatternBackground(lineColors);

    const colorBarContent =
      lineColors.length > 1 ? (
        <div
          className='df-event-color-bar-overlay'
          style={{
            background: colorBarValue,
            clipPath: colorBarClipPath,
          }}
        />
      ) : (
        <div
          className='df-event-color-bar'
          style={{
            backgroundColor: colorBarValue,
          }}
        />
      );

    const rawPadding = getDynamicPadding(drag);
    const density = rawPadding.includes('compact') ? 'compact' : 'default';

    return (
      <div className='df-drag-indicator-regular-wrapper'>
        {colorBarContent}
        <div
          className='df-event-timed-content'
          data-density={density}
          data-light={isLightBackground}
        >
          <div
            className={`df-event-title ${drag.endHour - drag.startHour <= 0.25 ? 'df-event-title-tight' : ''} ${isMobile ? 'df-mobile-mask-fade' : ''}`}
            data-light={isLightBackground}
          >
            {title}
          </div>
          {!drag.allDay && drag.endHour - drag.startHour > 0.5 && (
            <div className='df-event-time' data-light={isLightBackground}>
              {formatTime(drag.startHour)} - {formatTime(drag.endHour)}
            </div>
          )}
        </div>
        {isMobile && (
          <>
            <div
              className='df-event-touch-resize-indicator'
              data-axis='vertical'
              data-position='top'
              style={{ color: lineColors[0] || getLineColor('blue') }}
            />
            <div
              className='df-event-touch-resize-indicator'
              data-axis='vertical'
              data-position='bottom'
              style={{ color: lineColors[0] || getLineColor('blue') }}
            />
          </>
        )}
      </div>
    );
  },

  renderDefaultContent: ({ drag: _drag, title, allDay, isMobile }) => {
    if (allDay) {
      return (
        <div className='df-drag-indicator-all-day'>
          <CalendarDaysIcon className='df-drag-indicator-icon' />
          <div
            className={`df-event-title df-event-title-tight ${isMobile ? 'df-mobile-mask-fade' : ''}`}
          >
            {title}
          </div>
        </div>
      );
    }

    return (
      <div className='df-drag-indicator-regular-wrapper'>
        <div className='df-fill-primary df-event-color-bar' />
        <div className='df-event-timed-content' data-density='default'>
          <div
            className={`df-text-primary df-event-title ${isMobile ? 'df-mobile-mask-fade' : ''}`}
          >
            {title}
          </div>
        </div>
      </div>
    );
  },
};
