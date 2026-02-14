import {
  DragIndicatorProps,
  DragIndicatorRenderer,
} from '@/types/dragIndicator';
import { DefaultDragIndicatorRenderer } from '@/components/weekView/DragIndicator/DefaultDragIndicator';
import { useLocale } from '@/locale';

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
}: DragIndicatorComponentProps & any) => {
  const { t } = useLocale();
  const eventTitle = title || (allDay ? t('newAllDayEvent') : t('newEvent'));

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
          isMobile,
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
          isMobile,
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
      isMobile,
    });
  };

  return <div className="drag-indicator-content">{renderContent()}</div>;
};

export default DragIndicatorComponent;
