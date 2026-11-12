import { RefObject } from 'preact';
import {
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'preact/hooks';

import { observePanelInViewport } from '@/components/calendarEvent/utils';
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

export interface EventDetailPanelHostProps {
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
  const segmentKey = detailPanelEventId.includes('::day-')
    ? escapeAttributeValue(detailPanelEventId.replace(/::day-\d+/, ''))
    : null;

  const anchor =
    document.querySelector<HTMLElement>(
      `[data-detail-panel-key="${detailKey}"]`
    ) ??
    (segmentKey
      ? document.querySelector<HTMLElement>(
          `[data-detail-panel-key="${segmentKey}"]`
        )
      : null) ??
    document.querySelector<HTMLElement>(`[data-event-id="${baseId}"]`);

  if (!anchor) return null;
  return anchor.querySelector<HTMLElement>('.df-month-segment-event') ?? anchor;
};

const calculatePosition = (
  anchorElement: HTMLElement,
  panelElement: HTMLElement,
  calendarElement: HTMLElement,
  detailPanelEventId?: string | null
): EventDetailPosition => {
  const anchorRect = anchorElement.getBoundingClientRect();
  const panelRect = panelElement.getBoundingClientRect();
  const calendarRect = calendarElement.getBoundingClientRect();
  const panelWidth = panelRect.width;
  const panelHeight = panelRect.height;
  const boundaryWidth = Math.min(window.innerWidth, calendarRect.right);
  const boundaryHeight = Math.min(window.innerHeight, calendarRect.bottom);

  let effectiveLeft = anchorRect.left;
  let effectiveRight = anchorRect.right;

  const dayMatch = detailPanelEventId?.match(/::day-(\d+)/);
  let targetDayIndex: number | null = dayMatch
    ? Number.parseInt(dayMatch[1], 10)
    : null;

  if (targetDayIndex === null && anchorElement.dataset.startDay !== undefined) {
    const startDay = Number.parseInt(anchorElement.dataset.startDay, 10);
    const endDay = Number.parseInt(
      anchorElement.dataset.endDay ?? anchorElement.dataset.startDay,
      10
    );
    if (startDay === endDay) {
      targetDayIndex = startDay;
    }
  }

  if (targetDayIndex !== null && calendarRect.width > 0) {
    const dayColWidth = calendarRect.width / 7;
    const dayColLeft = calendarRect.left + targetDayIndex * dayColWidth;
    const dayColRight = dayColLeft + dayColWidth;
    effectiveLeft = Math.max(anchorRect.left, dayColLeft);
    effectiveRight = Math.min(anchorRect.right, dayColRight);
  }

  const spaceOnRight = boundaryWidth - effectiveRight;
  const spaceOnLeft = effectiveLeft - calendarRect.left;

  let left: number;
  if (spaceOnRight >= panelWidth + 20) {
    left = effectiveRight + 10;
  } else if (spaceOnLeft >= panelWidth + 20) {
    left = effectiveLeft - panelWidth - 10;
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
    isSunday: left < effectiveLeft,
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
      calculatePosition(
        anchorElement,
        panelRef.current,
        calendarRef.current,
        detailPanelEventId
      )
    );
  }, [calendarRef, detailPanelEventId]);

  useLayoutEffect(() => {
    if (!showPanel) return;
    updatePosition();
    const onLayoutChange = () => updatePosition();
    window.addEventListener('resize', onLayoutChange);
    window.addEventListener('scroll', onLayoutChange, true);
    const stopObserving = panelRef.current
      ? observePanelInViewport(panelRef.current, update =>
          setPosition(prev => {
            const top = update(prev.top);
            return top === prev.top ? prev : { ...prev, top };
          })
        )
      : undefined;

    return () => {
      window.removeEventListener('resize', onLayoutChange);
      window.removeEventListener('scroll', onLayoutChange, true);
      stopObserving?.();
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
