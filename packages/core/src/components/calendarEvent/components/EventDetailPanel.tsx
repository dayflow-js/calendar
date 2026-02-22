import { Event, ICalendarApp, EventDetailPosition } from '@/types';
import DefaultEventDetailPanel from '../../common/DefaultEventDetailPanel';
import { EventDetailPanelWithContent } from '../../common/EventDetailPanelWithContent';

interface EventDetailPanelProps {
  showDetailPanel: boolean;
  customEventDetailDialog: any;
  detailPanelPosition: EventDetailPosition | null;
  event: Event;
  detailPanelRef: { current: HTMLElement | null };
  isAllDay: boolean;
  eventVisibility: 'visible' | 'sticky-top' | 'sticky-bottom';
  calendarRef: any;
  selectedEventElementRef: any;
  onEventUpdate: (event: Event) => void;
  onEventDelete: (id: string) => void;
  handlePanelClose: () => void;
  customRenderingStore: any;
  contentSlotRenderer: any;
  customDetailPanelContent: any;
  app?: ICalendarApp;
}

export const EventDetailPanel = ({
  showDetailPanel,
  customEventDetailDialog,
  detailPanelPosition,
  event,
  detailPanelRef,
  isAllDay,
  eventVisibility,
  calendarRef,
  selectedEventElementRef,
  onEventUpdate,
  onEventDelete,
  handlePanelClose,
  customRenderingStore,
  contentSlotRenderer,
  customDetailPanelContent,
  app,
}: EventDetailPanelProps) => {
  if (!showDetailPanel) return null;

  if (customEventDetailDialog) {
    // Dialog rendering is handled at CalendarRoot level
    return null;
  }

  if (!detailPanelPosition) return null;

  const panelProps = {
    event,
    position: detailPanelPosition,
    panelRef: detailPanelRef,
    isAllDay,
    eventVisibility,
    calendarRef,
    selectedEventElementRef,
    onEventUpdate,
    onEventDelete,
    onClose: handlePanelClose,
  };

  if (customRenderingStore?.isOverridden('eventDetailContent')) {
    return (
      <EventDetailPanelWithContent
        {...panelProps}
        contentRenderer={contentSlotRenderer}
      />
    );
  }

  if (customDetailPanelContent) {
    return (
      <EventDetailPanelWithContent
        {...panelProps}
        contentRenderer={customDetailPanelContent}
      />
    );
  }

  return <DefaultEventDetailPanel {...panelProps} app={app} />;
};
