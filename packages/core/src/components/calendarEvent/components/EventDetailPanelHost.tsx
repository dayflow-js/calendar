import { RefObject } from 'preact';
import {
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'preact/hooks';

import { ContentSlot } from '@/renderer/ContentSlot';
import { CustomRenderingContext } from '@/renderer/CustomRenderingContext';
import {
  Event,
  EventDetailContentProps,
  EventDetailPosition,
  ICalendarApp,
} from '@/types';

import { EventDetailPanel } from './EventDetailPanel';

const PLACEHOLDER_POSITION: EventDetailPosition = {
  top: -9999,
  left: -9999,
  eventHeight: 0,
  eventMiddleY: 0,
  isSunday: false,
};

interface EventDetailPanelHostProps {
  detailPanelEventId: string | null;
  events: Event[];
  calendarRef: RefObject<HTMLDivElement>;
  useEventDetailPanel?: boolean;
  isMobile?: boolean;
  onEventUpdate: (event: Event) => void;
  onEventDelete: (id: string) => void;
  onEventSelect?: (id: string | null) => void;
  onDetailPanelToggle?: (id: string | null) => void;
  app?: ICalendarApp;
}

const getBaseEventId = (detailPanelEventId: string) =>
  detailPanelEventId.split('::')[0];

const escapeAttributeValue = (value: string) =>
  typeof CSS !== 'undefined' && CSS.escape
    ? CSS.escape(value)
    : value.replaceAll(/["\\]/g, '\\$&');

const findAnchorElement = (detailPanelEventId: string) => {
  const detailKey = escapeAttributeValue(detailPanelEventId);
  const baseId = escapeAttributeValue(getBaseEventId(detailPanelEventId));

  return (
    document.querySelector<HTMLElement>(
      `[data-detail-panel-key="${detailKey}"]`
    ) ?? document.querySelector<HTMLElement>(`[data-event-id="${baseId}"]`)
  );
};

const calculatePosition = (
  anchorElement: HTMLElement,
  panelElement: HTMLElement,
  calendarElement: HTMLElement
): EventDetailPosition => {
  const anchorRect = anchorElement.getBoundingClientRect();
  const panelRect = panelElement.getBoundingClientRect();
  const calendarRect = calendarElement.getBoundingClientRect();
  const panelWidth = panelRect.width;
  const panelHeight = panelRect.height;
  const boundaryWidth = Math.min(window.innerWidth, calendarRect.right);
  const boundaryHeight = Math.min(window.innerHeight, calendarRect.bottom);
  const spaceOnRight = boundaryWidth - anchorRect.right;
  const spaceOnLeft = anchorRect.left - calendarRect.left;

  let left: number;
  if (spaceOnRight >= panelWidth + 20) {
    left = anchorRect.right + 10;
  } else if (spaceOnLeft >= panelWidth + 20) {
    left = anchorRect.left - panelWidth - 10;
  } else {
    left =
      spaceOnRight > spaceOnLeft
        ? Math.max(calendarRect.left + 10, boundaryWidth - panelWidth - 10)
        : calendarRect.left + 10;
  }

  const idealTop = anchorRect.top - panelHeight / 2 + anchorRect.height / 2;
  const topBoundary = Math.max(10, calendarRect.top + 10);
  const bottomBoundary = boundaryHeight - 10;
  const top =
    idealTop < topBoundary
      ? topBoundary
      : idealTop + panelHeight > bottomBoundary
        ? bottomBoundary - panelHeight
        : idealTop;

  return {
    top,
    left,
    eventHeight: anchorRect.height,
    eventMiddleY: anchorRect.top + anchorRect.height / 2,
    isSunday: left < anchorRect.left,
  };
};

export const EventDetailPanelHost = ({
  detailPanelEventId,
  events,
  calendarRef,
  useEventDetailPanel,
  isMobile = false,
  onEventUpdate,
  onEventDelete,
  onEventSelect,
  onDetailPanelToggle,
  app,
}: EventDetailPanelHostProps) => {
  const customRenderingStore = useContext(CustomRenderingContext);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedEventElementRef = useRef<HTMLElement | null>(null);
  const [position, setPosition] =
    useState<EventDetailPosition>(PLACEHOLDER_POSITION);

  const event = detailPanelEventId
    ? events.find(item => item.id === getBaseEventId(detailPanelEventId))
    : null;
  const enabled = useEventDetailPanel !== false && !isMobile;
  const showPanel = enabled && !!detailPanelEventId && !!event;

  const updatePosition = useCallback(() => {
    if (!detailPanelEventId || !panelRef.current || !calendarRef.current) {
      return;
    }

    const anchorElement = findAnchorElement(detailPanelEventId);
    if (!anchorElement) return;

    selectedEventElementRef.current = anchorElement;
    setPosition(
      calculatePosition(anchorElement, panelRef.current, calendarRef.current)
    );
  }, [calendarRef, detailPanelEventId]);

  useLayoutEffect(() => {
    if (!showPanel) return;
    updatePosition();
    const onLayoutChange = () => updatePosition();
    window.addEventListener('resize', onLayoutChange);
    window.addEventListener('scroll', onLayoutChange, true);

    return () => {
      window.removeEventListener('resize', onLayoutChange);
      window.removeEventListener('scroll', onLayoutChange, true);
    };
  }, [showPanel, updatePosition]);

  const handlePanelClose = useCallback(() => {
    onEventSelect?.(null);
    onDetailPanelToggle?.(null);
  }, [onEventSelect, onDetailPanelToggle]);

  const contentSlotRenderer = useCallback(
    (contentProps: EventDetailContentProps) => (
      <ContentSlot
        store={customRenderingStore}
        generatorName='eventDetailContent'
        generatorArgs={contentProps}
      />
    ),
    [customRenderingStore]
  );

  if (!showPanel || !event) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998,
          pointerEvents: 'none',
        }}
      />
      <EventDetailPanel
        showDetailPanel
        detailPanelPosition={position}
        event={event}
        detailPanelRef={panelRef}
        isAllDay={!!event.allDay}
        eventVisibility='standard'
        calendarRef={calendarRef}
        selectedEventElementRef={selectedEventElementRef}
        onEventUpdate={onEventUpdate}
        onEventDelete={onEventDelete}
        handlePanelClose={handlePanelClose}
        customRenderingStore={customRenderingStore}
        contentSlotRenderer={contentSlotRenderer}
        app={app}
      />
    </>
  );
};
