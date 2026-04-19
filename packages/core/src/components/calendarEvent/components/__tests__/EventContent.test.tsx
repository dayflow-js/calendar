import { render, screen } from '@testing-library/preact';
import { Temporal } from 'temporal-polyfill';

import { EventContent } from '@/components/calendarEvent/components/EventContent';
import { ViewType, Event } from '@/types';

const baseEvent: Event = {
  id: 'event-1',
  title: 'All Day in Month',
  calendarId: 'default',
  allDay: false,
  start: Temporal.ZonedDateTime.from('2026-04-07T09:00:00+00:00[UTC]'),
  end: Temporal.ZonedDateTime.from('2026-04-07T10:00:00+00:00[UTC]'),
};

describe('EventContent', () => {
  it('prefers the isAllDay prop for month view rendering', () => {
    render(
      <EventContent
        event={baseEvent}
        viewType={ViewType.MONTH}
        isAllDay
        isMultiDay={false}
        segmentIndex={0}
        isBeingDragged={false}
        isBeingResized={false}
        isEventSelected={false}
        isPopping={false}
        isEditable={false}
        isDraggable={false}
        canOpenDetail={true}
        isTouchEnabled={false}
        isMobile={false}
        customRenderingStore={null}
        eventContentSlotArgs={{}}
      />
    );

    const title = screen.getByText('All Day in Month');
    expect(title.className).toContain('df-event-month-title');
  });

  it('uses mask fade for month all-day titles on mobile', () => {
    render(
      <EventContent
        event={baseEvent}
        viewType={ViewType.MONTH}
        isAllDay
        isMultiDay={false}
        segmentIndex={0}
        isBeingDragged={false}
        isBeingResized={false}
        isEventSelected={false}
        isPopping={false}
        isEditable={false}
        isDraggable={false}
        canOpenDetail={true}
        isTouchEnabled={false}
        isMobile
        customRenderingStore={null}
        eventContentSlotArgs={{}}
      />
    );

    const title = screen.getByText('All Day in Month');
    expect(title.className).toContain('df-mobile-mask-fade');
  });
});
