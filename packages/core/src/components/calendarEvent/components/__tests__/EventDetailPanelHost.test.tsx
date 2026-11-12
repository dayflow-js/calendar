import { render, act } from '@testing-library/preact';
import { Temporal } from 'temporal-polyfill';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/locale';
import { Event as CalendarEventModel } from '@/types';

import { EventDetailPanelHost } from '../EventDetailPanelHost';

const makeRect = (
  left: number,
  top: number,
  width: number,
  height: number
): DOMRect =>
  ({
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

describe('EventDetailPanelHost', () => {
  let calendarDiv: HTMLDivElement;
  const mockEvent: CalendarEventModel = {
    id: 'evt-1',
    title: 'Sunday All-Day Event',
    start: Temporal.PlainDate.from('2026-09-20'),
    end: Temporal.PlainDate.from('2026-09-20'),
    allDay: true,
  };

  beforeEach(() => {
    calendarDiv = document.createElement('div');
    // Calendar width 700px, left 0, right 700 (each day is 100px)
    vi.spyOn(calendarDiv, 'getBoundingClientRect').mockReturnValue(
      makeRect(0, 0, 700, 500)
    );
    document.body.append(calendarDiv);
  });

  it('positions the panel to the left of a Sunday event with isSunday: true', () => {
    // In Month view, the outer .df-event has position: static and spans the full 700px width.
    const outerEvent = document.createElement('div');
    outerEvent.className = 'df-event';
    outerEvent.dataset.detailPanelKey = 'evt-1::seg-1';
    outerEvent.dataset.eventId = 'evt-1';
    vi.spyOn(outerEvent, 'getBoundingClientRect').mockReturnValue(
      makeRect(0, 100, 700, 24)
    );

    // Inside it is .df-month-segment-event on Sunday (col 6: left=600, width=100)
    const innerSegment = document.createElement('div');
    innerSegment.className = 'df-month-segment-event';
    innerSegment.dataset.startDay = '6';
    innerSegment.dataset.endDay = '6';
    vi.spyOn(innerSegment, 'getBoundingClientRect').mockReturnValue(
      makeRect(600, 100, 100, 24)
    );
    outerEvent.append(innerSegment);
    calendarDiv.append(outerEvent);

    const onUpdate = vi.fn();
    const onDelete = vi.fn();

    render(
      <ThemeProvider initialTheme='light'>
        <LocaleProvider>
          <EventDetailPanelHost
            detailPanelEventId='evt-1::seg-1::day-6'
            events={[mockEvent]}
            calendarRef={{ current: calendarDiv }}
            onEventUpdate={onUpdate}
            onEventDelete={onDelete}
          />
        </LocaleProvider>
      </ThemeProvider>
    );

    const panel = document.querySelector(
      '[data-event-detail-panel]'
    ) as HTMLElement;
    expect(panel).toBeTruthy();

    // Mock panel width: 300px, height: 200px
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(
      makeRect(0, 0, 300, 200)
    );

    // Trigger resize to recalculate position with panel measurements
    act(() => {
      window.dispatchEvent(new window.Event('resize'));
    });

    // Effective anchor is Sunday (left=600, right=700).
    // Space on right is 0 (< 320).
    // Space on left is 600 (>= 320).
    // Left should be anchor.left (600) - panelWidth (300) - 10 = 290px.
    // It should NOT be at the far left (calendarRect.left + 10 = 10px).
    const panelLeft = Number.parseFloat(panel.style.left);
    expect(panelLeft).toBe(290);
  });
});
