import { RefObject } from 'preact';

import DefaultEventDetailPanel from '@/components/common/DefaultEventDetailPanel';
import { EventDetailPanelWithContent } from '@/components/common/EventDetailPanelWithContent';
import { CustomRenderingStore } from '@/renderer/CustomRenderingStore';
import {
  Event,
  ICalendarApp,
  EventDetailPosition,
  EventDetailContentRenderer,
} from '@/types';

interface EventDetailPanelProps {
  showDetailPanel: boolean;
  detailPanelPosition: EventDetailPosition | null;
  event: Event;
  detailPanelRef: RefObject<HTMLDivElement>;
  isAllDay: boolean;
  eventVisibility:
    | 'standard'
    | 'sticky-top'
    | 'sticky-bottom'
    | 'sticky-left'
    | 'sticky-right';
  calendarRef: RefObject<HTMLDivElement>;
  selectedEventElementRef: RefObject<HTMLElement | null>;
  onEventUpdate: (event: Event) => void;
  onEventDelete: (id: string) => void;
  handlePanelClose: () => void;
  customRenderingStore: CustomRenderingStore | null;
  contentSlotRenderer: EventDetailContentRenderer;
  app?: ICalendarApp;
}

export const EventDetailPanel = ({
  showDetailPanel,
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
  app,
}: EventDetailPanelProps) => {
  if (!showDetailPanel) return null;

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

  return <DefaultEventDetailPanel {...panelProps} app={app} />;
};
