import React from 'react';
import {
  DragIndicatorProps,
  DragIndicatorRenderer,
} from '@/types/dragIndicator';
import { DefaultDragIndicatorRenderer } from '@/components/weekView/DragIndicator/DefaultDragIndicator';

interface DragIndicatorComponentProps extends DragIndicatorProps {
  renderer?: DragIndicatorRenderer;
}

const DragIndicatorComponent: React.FC<DragIndicatorComponentProps> = ({
  drag,
  color,
  title,
  layout,
  allDay,
  formatTime,
  getLineColor,
  getDynamicPadding,
  renderer = DefaultDragIndicatorRenderer,
}) => {
  const eventTitle = title || (allDay ? 'New All-day Event' : 'New Event');

  const renderContent = () => {
    if (color) {
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
        });
      } else {
        return renderer.renderRegularContent({
          drag,
          color,
          title: eventTitle,
          layout,
          allDay,
          formatTime,
          getLineColor,
          getDynamicPadding,
        });
      }
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
    });
  };

  return <div className="drag-indicator-content">{renderContent()}</div>;
};

export default DragIndicatorComponent;
