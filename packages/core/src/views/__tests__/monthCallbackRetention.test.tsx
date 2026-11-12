import { render } from '@testing-library/preact';
import { RefObject } from 'preact';
import { Temporal } from 'temporal-polyfill';

import { CalendarApp } from '@/core/CalendarApp';
import { createMonthView } from '@/factories/createMonthView';
import { MonthViewProps } from '@/types';
import MonthView from '@/views/MonthView';

const { callbacks } = vi.hoisted(() => ({
  callbacks: { current: {} as Record<string, (...args: unknown[]) => void> },
}));

vi.mock('@/components/monthView/WeekComponent', () => ({
  default: (props: Record<string, unknown>) => {
    callbacks.current = Object.fromEntries(
      Object.entries(props).filter(([key]) =>
        [
          'onEventSelect',
          'onEventLongPress',
          'onGridDateClick',
          'onGridDateDoubleClick',
          'onSelectDate',
          'onEventUpdate',
          'onEventDelete',
          'onDetailPanelOpen',
          'onDetailPanelToggle',
        ].includes(key)
      )
    ) as typeof callbacks.current;
    return null;
  },
}));

it('keeps MonthView callbacks stable across event/config replacements and clears them on unmount', () => {
  const app = new CalendarApp({
    views: [createMonthView()],
    initialDate: new Date(2026, 4, 1),
    defaultView: 'month',
  });
  const firstClick = vi.fn();
  const nextClick = vi.fn();
  const props: MonthViewProps & { calendarRef: RefObject<HTMLDivElement> } = {
    app,
    config: { gridDateClick: firstClick },
    calendarRef: { current: null },
  };
  const { rerender, unmount } = render(<MonthView {...props} />);
  const initial = callbacks.current;
  app.addEvent({
    id: 'replacement',
    title: 'Replacement',
    start: Temporal.PlainDate.from('2026-05-12'),
    end: Temporal.PlainDate.from('2026-05-13'),
    allDay: true,
  });
  rerender(<MonthView {...props} config={{ gridDateClick: nextClick }} />);
  expect(Object.keys(initial).length).toBe(9);
  for (const name of Object.keys(initial)) {
    expect(callbacks.current[name], name).toBe(initial[name]);
  }
  initial.onGridDateClick(new Date(2026, 4, 12), []);
  expect(firstClick).not.toHaveBeenCalled();
  expect(nextClick).toHaveBeenCalledOnce();
  unmount();
  nextClick.mockClear();
  initial.onGridDateClick(new Date(2026, 4, 12), []);
  expect(nextClick).not.toHaveBeenCalled();
  callbacks.current = {};
});
