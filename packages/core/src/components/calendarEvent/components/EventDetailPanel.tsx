import { RefObject } from 'preact';

import DefaultEventDetailPanel from '@/components/common/DefaultEventDetailPanel';
import { EventDetailPanelWithContent } from '@/components/common/EventDetailPanelWithContent';
import { CustomRenderingStore } from '@/renderer/CustomRenderingStore';
import {
  Event,
  ICalendarApp,
  EventDetailPosition,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
} from '@/types';

interface EventDetailPanelProps {
  showDetailPanel: boolean;
  customEventDetailDialog?: EventDetailDialogRenderer;
  detailPanelPosition: EventDetailPosition | null;
  event: Event;
  detailPanelRef: RefObject<HTMLDivElement>;
  isAllDay: boolean;
  eventVisibility: 'visible' | 'sticky-top' | 'sticky-bottom';
  calendarRef: RefObject<HTMLDivElement>;
  selectedEventElementRef: RefObject<HTMLElement | null>;
  onEventUpdate: (event: Event) => void;
  onEventDelete: (id: string) => void;
  handlePanelClose: () => void;
  customRenderingStore: CustomRenderingStore | null;
  contentSlotRenderer: EventDetailContentRenderer;
  customDetailPanelContent?: EventDetailContentRenderer;
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
