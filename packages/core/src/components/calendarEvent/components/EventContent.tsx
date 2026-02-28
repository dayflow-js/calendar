import MultiDayEvent from '@/components/monthView/MultiDayEvent';
import { MultiDayEventSegment } from '@/components/monthView/WeekComponent';
import { YearMultiDaySegment } from '@/components/yearView/utils';
import { ContentSlot } from '@/renderer/ContentSlot';
import { CustomRenderingStore } from '@/renderer/CustomRenderingStore';
import { ViewType, Event, ICalendarApp, EventLayout } from '@/types';

import AllDayContent from './AllDayContent';
import MonthAllDayContent from './MonthAllDayContent';
import MonthRegularContent from './MonthRegularContent';
import RegularEventContent from './RegularEventContent';
import YearEventContent from './YearEventContent';

interface EventContentProps {
  event: Event;
  viewType: ViewType;
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
}

export const EventContent = ({
  event,
  viewType,
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
}: EventContentProps) => {
  const isMonthView = viewType === ViewType.MONTH;
  const isYearView = viewType === ViewType.YEAR;

  let defaultContent;
  if (isYearView && yearSegment) {
    defaultContent = (
      <YearEventContent
        event={event}
        segment={yearSegment}
        isEditable={isEditable}
        onMoveStart={onMoveStart}
        onResizeStart={onResizeStart}
      />
    );
  } else if (isMonthView) {
    if (isMultiDay && segment) {
      defaultContent = (
        <MultiDayEvent
          segment={segment}
          segmentIndex={segmentIndex ?? 0}
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
        />
      );
    } else {
      defaultContent = event.allDay ? (
        <MonthAllDayContent event={event} isEventSelected={isEventSelected} />
      ) : (
        <MonthRegularContent
          event={event}
          app={app}
          isEventSelected={isEventSelected}
          hideTime={hideTime}
          isMobile={isMobile}
        />
      );
    }
  } else {
    defaultContent = event.allDay ? (
      <AllDayContent
        event={event}
        isEditable={isEditable}
        onResizeStart={onResizeStart}
        isMultiDay={isMultiDay}
        segment={segment}
        isSlidingView={isSlidingView}
      />
    ) : (
      <RegularEventContent
        event={event}
        app={app}
        multiDaySegmentInfo={multiDaySegmentInfo}
        isEditable={isEditable}
        isTouchEnabled={isTouchEnabled}
        isEventSelected={isEventSelected}
        onResizeStart={onResizeStart}
        timeFormat={timeFormat}
      />
    );
  }

  return (
    <ContentSlot
      store={customRenderingStore}
      generatorName='eventContent'
      generatorArgs={eventContentSlotArgs}
      defaultContent={defaultContent}
    />
  );
};
