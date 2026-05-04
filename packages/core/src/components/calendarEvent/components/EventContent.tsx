import { ComponentChildren } from 'preact';

import MultiDayEvent from '@/components/monthView/MultiDayEvent';
import { MultiDayEventSegment } from '@/components/monthView/util';
import { YearMultiDaySegment } from '@/components/yearView/utils';
import { ContentSlot } from '@/renderer/ContentSlot';
import { CustomRenderingStore } from '@/renderer/CustomRenderingStore';
import { ViewType, Event, ICalendarApp, EventLayout } from '@/types';

import AllDayContent from './AllDayContent';
import MonthAllDayContent from './MonthAllDayContent';
import MonthRegularContent from './MonthRegularContent';
import RegularEventContent from './RegularEventContent';
import YearEventContent from './YearEventContent';

/** Resolve the most specific overridden generator name. Returns null if not overridden. */
function resolveGeneratorName(
  store: CustomRenderingStore | null,
  viewType: ViewType,
  isAllDay: boolean
): string | null {
  const viewKey =
    (viewType as string).charAt(0).toUpperCase() +
    (viewType as string).slice(1);
  const specificName = isAllDay
    ? `eventContentAllDay${viewKey}` // e.g. 'eventContentAllDayDay'
    : `eventContent${viewKey}`; // e.g. 'eventContentDay'

  if (store?.isOverridden(specificName)) return specificName;
  return null;
}

interface EventContentProps {
  event: Event;
  viewType: ViewType;
  isAllDay: boolean;
  isMultiDay: boolean;
  segment?: MultiDayEventSegment;
  yearSegment?: YearMultiDaySegment;
  segmentIndex: number;
  isBeingDragged: boolean;
  isBeingResized: boolean;
  isEventSelected: boolean;
  isPopping: boolean;
  isEditable: boolean;
  isDraggable: boolean;
  canOpenDetail: boolean;
  isTouchEnabled: boolean;
  hideTime?: boolean;
  isMobile: boolean;
  isSlidingView?: boolean;
  app?: ICalendarApp;
  onMoveStart?: (e: MouseEvent | TouchEvent, event: Event) => void;
  onResizeStart?: (
    e: MouseEvent | TouchEvent,
    event: Event,
    direction: string
  ) => void;
  multiDaySegmentInfo?: {
    startHour: number;
    endHour: number;
    isFirst: boolean;
    isLast: boolean;
    dayIndex?: number;
  };
  customRenderingStore: CustomRenderingStore | null;
  // oxlint-disable-next-line typescript/no-explicit-any
  eventContentSlotArgs: any;
  layout?: EventLayout;
  timeFormat?: '12h' | '24h';
  appTimeZone?: string;
  renderVisualContent?: (
    defaultContent: ComponentChildren
  ) => ComponentChildren;
  resizeHandleOrientation?: 'vertical' | 'horizontal';
  monthEventHeight?: number;
}

export const EventContent = ({
  event,
  viewType,
  isAllDay,
  isMultiDay,
  segment,
  yearSegment,
  segmentIndex,
  isBeingDragged,
  isBeingResized,
  isEventSelected,
  isPopping,
  isEditable,
  isDraggable,
  canOpenDetail,
  isTouchEnabled,
  hideTime,
  isMobile,
  isSlidingView,
  app,
  onMoveStart,
  onResizeStart,
  multiDaySegmentInfo,
  customRenderingStore,
  eventContentSlotArgs,
  timeFormat = '24h',
  appTimeZone,
  renderVisualContent,
  resizeHandleOrientation,
  monthEventHeight,
}: EventContentProps) => {
  const isMonthView = viewType === ViewType.MONTH;
  const isYearView = viewType === ViewType.YEAR;

  const generatorName = resolveGeneratorName(
    customRenderingStore,
    viewType,
    isAllDay
  );

  const applyVisualWrapper = (defaultContent: ComponentChildren) =>
    renderVisualContent ? renderVisualContent(defaultContent) : defaultContent;

  // Month multi-day: MultiDayEvent owns absolute positioning and resize handles.
  // Year view: YearEventContent owns resize handles (CalendarEvent shell handles positioning).
  // In both cases the ContentSlot is injected via renderSlot so those are preserved
  // even when the user provides a custom event content renderer.
  if (isMonthView && isMultiDay && segment) {
    return (
      <MultiDayEvent
        segment={segment}
        segmentIndex={segmentIndex ?? 0}
        eventHeight={monthEventHeight}
        isDragging={isBeingDragged || isEventSelected}
        isResizing={isBeingResized}
        isSelected={isEventSelected}
        onMoveStart={onMoveStart}
        onResizeStart={onResizeStart}
        isMobile={isMobile}
        isDraggable={isDraggable}
        isEditable={isEditable}
        viewable={canOpenDetail}
        isPopping={isPopping}
        appTimeZone={appTimeZone}
        renderSlot={defaultContent => (
          <ContentSlot
            store={customRenderingStore}
            generatorName={generatorName}
            generatorArgs={eventContentSlotArgs}
            defaultContent={applyVisualWrapper(defaultContent)}
          />
        )}
      />
    );
  }

  if (isYearView && yearSegment) {
    return (
      <YearEventContent
        event={event}
        segment={yearSegment}
        isEditable={isEditable}
        onMoveStart={onMoveStart}
        onResizeStart={onResizeStart}
        renderSlot={defaultContent => (
          <ContentSlot
            store={customRenderingStore}
            generatorName={generatorName}
            generatorArgs={eventContentSlotArgs}
            defaultContent={applyVisualWrapper(defaultContent)}
          />
        )}
      />
    );
  }

  if (isMonthView) {
    const defaultContent = isAllDay ? (
      <MonthAllDayContent
        event={event}
        isEventSelected={isEventSelected}
        isMobile={isMobile}
      />
    ) : (
      <MonthRegularContent
        event={event}
        app={app}
        isEventSelected={isEventSelected}
        hideTime={hideTime}
        isMobile={isMobile}
      />
    );
    return (
      <ContentSlot
        store={customRenderingStore}
        generatorName={generatorName}
        generatorArgs={eventContentSlotArgs}
        defaultContent={applyVisualWrapper(defaultContent)}
      />
    );
  }

  // Day/Week view: resize handles live inside AllDayContent/RegularEventContent.
  // Use renderSlot so resize handles are always rendered even when a custom slot overrides
  // the visual content.
  const slotRenderer = (defaultContent: ComponentChildren) => (
    <ContentSlot
      store={customRenderingStore}
      generatorName={generatorName}
      generatorArgs={eventContentSlotArgs}
      defaultContent={applyVisualWrapper(defaultContent)}
    />
  );

  if (isAllDay) {
    return (
      <AllDayContent
        event={event}
        isEditable={isEditable}
        onResizeStart={onResizeStart}
        isMultiDay={isMultiDay}
        segment={segment}
        isSlidingView={isSlidingView}
        renderSlot={slotRenderer}
      />
    );
  }

  return (
    <RegularEventContent
      event={event}
      app={app}
      multiDaySegmentInfo={multiDaySegmentInfo}
      isEditable={isEditable}
      isTouchEnabled={isTouchEnabled}
      isEventSelected={isEventSelected}
      onResizeStart={onResizeStart}
      timeFormat={timeFormat}
      resizeHandleOrientation={resizeHandleOrientation}
      renderSlot={slotRenderer}
    />
  );
};
