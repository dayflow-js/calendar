import {
  DragIndicatorProps,
  DragIndicatorRenderer,
  useLocale,
} from '@dayflow/core';

import { DefaultDragIndicatorRenderer } from './DefaultDragIndicator';

interface DragIndicatorComponentProps extends DragIndicatorProps {
  renderer?: DragIndicatorRenderer;
}

const DragIndicatorComponent = ({
  drag,
  color,
  title,
  layout,
  allDay,
  formatTime,
  getLineColor,
  getDynamicPadding,
  renderer = DefaultDragIndicatorRenderer,
  isMobile,
  isLightBackground,
}: DragIndicatorComponentProps) => {
  const { t } = useLocale();
  const eventTitle = title || (allDay ? t('newAllDayEvent') : t('newEvent'));

  // Compute line colors for all calendars on this event
  const calendarLineColors: string[] =
    drag.calendarIds && drag.calendarIds.length > 0
      ? drag.calendarIds.map(id => getLineColor(id))
      : color
        ? [getLineColor(color)]
        : [];
  const hasCalendarColors = calendarLineColors.length > 0;

  const renderContent = () => {
    if (color || hasCalendarColors) {
      if (allDay) {
        return renderer.renderAllDayContent({
          drag,
          color,
          title: eventTitle,
          layout,
          allDay,
          formatTime,
          getLineColor,
          getDynamicPadding,
          isMobile,
          isLightBackground,
          calendarLineColors,
        });
      }
      return renderer.renderRegularContent({
        drag,
        color,
        title: eventTitle,
        layout,
        allDay,
        formatTime,
        getLineColor,
        getDynamicPadding,
        isMobile,
        isLightBackground,
        calendarLineColors,
      });
    }

    return renderer.renderDefaultContent({
      drag,
      color,
      title: eventTitle,
      layout,
      allDay,
      formatTime,
      getLineColor,
      getDynamicPadding,
      isMobile,
      isLightBackground,
      calendarLineColors,
    });
  };

  return (
    <div className='drag-indicator-content h-full w-full'>
      {renderContent()}
    </div>
  );
};

export default DragIndicatorComponent;
