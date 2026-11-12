import { fireEvent, render, screen } from '@testing-library/preact';

import { GridYearView } from '@/components/yearView/GridYearView';
import { CalendarApp } from '@/core/CalendarApp';
import { LocaleProvider } from '@/locale';
import { ViewType, YearViewConfig } from '@/types';

const createApp = (initialDate: Date) =>
  new CalendarApp({
    views: [],
    plugins: [],
    events: [],
    defaultView: ViewType.YEAR,
    initialDate,
    calendars: [],
  });

const renderGrid = (app: CalendarApp, config?: YearViewConfig) =>
  render(
    <LocaleProvider>
      <GridYearView app={app} config={config} />
    </LocaleProvider>
  );

const dayCell = (container: Element, key: string) =>
  container.querySelector<HTMLElement>(
    `[data-day-key='${key}'][data-current-month='true']`
  )!;

describe('GridYearView keyboard support', () => {
  it('exposes current-month days as named buttons and hides overflow days', () => {
    const { container } = renderGrid(createApp(new Date(2026, 4, 12)));

    const may12 = screen.getByRole('button', {
      name: 'Tuesday, May 12, 2026',
    });
    expect(may12.getAttribute('aria-haspopup')).toBe('dialog');

    const overflow = container.querySelector(
      "[data-grid-day-cell][data-current-month='false']"
    )!;
    expect(overflow.getAttribute('aria-hidden')).toBe('true');
    expect(overflow.hasAttribute('tabindex')).toBe(false);
  });

  it('keeps a single Tab stop on the current date', () => {
    const { container } = renderGrid(createApp(new Date(2026, 4, 12)));

    const tabStops = container.querySelectorAll(
      "[data-grid-day-cell][tabindex='0']"
    );
    expect(tabStops).toHaveLength(1);
    expect((tabStops[0] as HTMLElement).dataset.dayKey).toBe('2026-05-12');
  });

  it('moves focus between days with the arrow keys, across months', () => {
    const { container } = renderGrid(createApp(new Date(2026, 0, 31)));
    const jan31 = dayCell(container, '2026-01-31');
    jan31.focus();

    fireEvent.keyDown(jan31, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(dayCell(container, '2026-02-01'));

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(dayCell(container, '2026-02-08'));
    expect(dayCell(container, '2026-02-08').getAttribute('tabindex')).toBe('0');
    expect(jan31.getAttribute('tabindex')).toBe('-1');
  });

  it('does not move focus past the first day of the year', () => {
    const { container } = renderGrid(createApp(new Date(2026, 0, 1)));
    const jan1 = dayCell(container, '2026-01-01');
    jan1.focus();

    fireEvent.keyDown(jan1, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(jan1);
  });

  it('activates the day with Enter like a click', () => {
    const onClick = vi.fn();
    const { container } = renderGrid(createApp(new Date(2026, 4, 12)), {
      gridDateClick: onClick,
    });

    const may12 = dayCell(container, '2026-05-12');
    expect(may12.hasAttribute('aria-haspopup')).toBe(false);
    fireEvent.keyDown(may12, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]?.[0]).toEqual(new Date(2026, 4, 12));
  });
});
