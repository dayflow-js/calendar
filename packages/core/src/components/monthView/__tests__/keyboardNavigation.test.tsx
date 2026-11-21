import { act, fireEvent, render, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import { CalendarApp } from '@/core/CalendarApp';
import { createMonthView } from '@/factories/createMonthView';
import { LocaleProvider } from '@/locale';
import { MonthViewConfig } from '@/types';
import MonthView from '@/views/MonthView';

const mount = (
  config: MonthViewConfig = {},
  initialDate = new Date(2026, 2, 12),
  locale = 'en-US',
  calendarSystem: 'gregorian' | 'jalali' = 'gregorian',
  includeEvents = true
) => {
  const events = Array.from({ length: 6 }, (_, index) => ({
    id: `event-${index}`,
    title: `Event ${index}`,
    start: Temporal.PlainDateTime.from(`2026-03-12T${index + 10}:00`),
    end: Temporal.PlainDateTime.from(`2026-03-12T${index + 11}:00`),
  }));
  const onGridDateClick = vi.fn();
  const onGridDateDoubleClick = vi.fn();
  const onMoreEventsClick = vi.fn();
  const monthConfig = {
    gridDateClick: onGridDateClick,
    gridDateDoubleClick: onGridDateDoubleClick,
    scroll: { instantNavigation: true },
    ...config,
  };
  const app = new CalendarApp({
    views: [createMonthView(monthConfig)],
    defaultView: 'month',
    initialDate,
    events: includeEvents ? events : [],
    useViewHeader: false,
    calendarSystem,
    callbacks: { onMoreEventsClick },
  });
  const Harness = () => {
    const [, update] = useState(0);
    useEffect(() => app.subscribe(() => update(value => value + 1)), []);
    return (
      <LocaleProvider locale={locale}>
        <button type='button'>Before calendar</button>
        <MonthView
          app={app}
          config={monthConfig}
          calendarRef={{ current: null }}
        />
        <button type='button'>After calendar</button>
      </LocaleProvider>
    );
  };
  const result = render(<Harness />);
  const cell = (date: string) =>
    result.container.querySelector<HTMLDivElement>(
      `.df-month-day-cell[data-date="${date}"]`
    )!;
  const grid = result.getByRole('grid');
  const tabStops = () =>
    grid.querySelectorAll('.df-month-day-cell[tabindex="0"]');
  return {
    ...result,
    app,
    cell,
    grid,
    tabStops,
    onGridDateClick,
    onGridDateDoubleClick,
    onMoreEventsClick,
  };
};

describe('month date keyboard navigation', () => {
  let originalScrollTo: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.stubGlobal('innerHeight', 876);
    originalScrollTo = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollTo'
    );
    // jsdom has no scrolling/layout; exercise the real virtual-scroll path.
    // eslint-disable-next-line no-extend-native
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(function (this: HTMLElement, options: ScrollToOptions) {
        this.scrollTop = options.top ?? 0;
      }),
    });
  });

  afterEach(() => {
    if (originalScrollTo)
      // eslint-disable-next-line no-extend-native
      Object.defineProperty(
        HTMLElement.prototype,
        'scrollTo',
        originalScrollTo
      );
    else delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('tabs into one date cell and exits the date grid with Tab', async () => {
    const user = userEvent.setup();
    const result = mount(
      {},
      new Date(2026, 2, 13),
      'en-US',
      'gregorian',
      false
    );
    result.getByRole('button', { name: 'Before calendar' }).focus();
    await user.tab();
    expect(result.cell('2026-03-13')).toHaveFocus();
    expect(result.tabStops()).toHaveLength(1);
    expect(result.tabStops()[0]).toBe(result.cell('2026-03-13'));
    expect(
      result.grid.querySelectorAll('.df-month-day-cell[tabindex="-1"]').length
    ).toBeGreaterThan(35);
    await user.tab();
    expect(
      result.getByRole('button', { name: 'After calendar' })
    ).toHaveFocus();
    await user.tab({ shift: true });
    expect(result.cell('2026-03-13')).toHaveFocus();
  });

  it.each([
    ['ArrowRight', '2026-03-13'],
    ['ArrowLeft', '2026-03-11'],
    ['ArrowDown', '2026-03-19'],
    ['ArrowUp', '2026-03-05'],
    ['Home', '2026-03-09'],
    ['End', '2026-03-15'],
  ])('moves focus with %s to %s', async (key, date) => {
    const user = userEvent.setup();
    const result = mount();
    act(() => result.cell('2026-03-12').focus());
    await user.keyboard(`{${key}}`);
    expect(result.cell(date)).toHaveFocus();
    expect(result.tabStops()).toHaveLength(1);
    expect(result.tabStops()[0]).toBe(result.cell(date));
    expect(result.onGridDateClick).not.toHaveBeenCalled();
  });

  it('uses the configured start of week for Home/End and crosses a week boundary', async () => {
    const user = userEvent.setup();
    const result = mount({ startOfWeek: 0 });
    act(() => result.cell('2026-03-12').focus());
    await user.keyboard('{Home}');
    expect(result.cell('2026-03-08')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(result.cell('2026-03-07')).toHaveFocus();
    await user.keyboard('{End}');
    expect(result.cell('2026-03-07')).toHaveFocus();
  });

  it.each(['{Enter}', ' '])(
    'runs gridDateClick for the focused date with %s',
    async key => {
      const user = userEvent.setup();
      const result = mount();
      act(() => result.cell('2026-03-12').focus());
      await user.keyboard(key);
      expect(result.onGridDateClick).toHaveBeenCalledExactlyOnceWith(
        new Date(2026, 2, 12),
        expect.arrayContaining([expect.objectContaining({ id: 'event-0' })]),
        // The pointer callback also receives no MouseEvent for a cell click.
        // eslint-disable-next-line unicorn/no-useless-undefined
        undefined
      );
      expect(result.onGridDateDoubleClick).not.toHaveBeenCalled();
    }
  );

  it('runs gridDateDoubleClick with Shift+Enter and preserves pointer actions', async () => {
    const user = userEvent.setup();
    const result = mount();
    act(() => result.cell('2026-03-12').focus());
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(result.onGridDateDoubleClick).toHaveBeenCalledExactlyOnceWith(
      new Date(2026, 2, 12),
      expect.any(Array),
      expect.objectContaining({ type: 'dblclick' })
    );
    expect(result.onGridDateClick).not.toHaveBeenCalled();
    fireEvent.click(result.cell('2026-03-13'));
    expect(result.onGridDateClick).toHaveBeenCalledExactlyOnceWith(
      new Date(2026, 2, 13),
      [],
      // eslint-disable-next-line unicorn/no-useless-undefined
      undefined
    );
    fireEvent.dblClick(result.cell('2026-03-13'));
    expect(result.onGridDateDoubleClick).toHaveBeenLastCalledWith(
      new Date(2026, 2, 13),
      [],
      expect.objectContaining({ type: 'dblclick' })
    );
  });

  it.each([
    { scroll: { instantNavigation: true } },
    { scroll: { disabled: true, transition: 'fade' } },
  ] as const)('navigates months and restores focus with %j', async config => {
    const user = userEvent.setup();
    const result = mount(config, new Date(2026, 0, 31));
    act(() => result.cell('2026-01-31').focus());
    await user.keyboard('{PageDown}');
    expect(result.app.getCurrentDate()).toEqual(new Date(2026, 1, 28));
    await vi.waitFor(() => expect(result.cell('2026-02-28')).toHaveFocus());
    expect(result.tabStops()).toHaveLength(1);
    await user.keyboard('{PageUp}');
    expect(result.app.getCurrentDate()).toEqual(new Date(2026, 0, 28));
    await vi.waitFor(() => expect(result.cell('2026-01-28')).toHaveFocus());
    if (!config.scroll.disabled)
      expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled();
  });

  it('uses calendar months in Jalali mode', async () => {
    const user = userEvent.setup();
    const result = mount(
      {},
      new Date(2026, 2, 21),
      'en-US-u-ca-persian',
      'jalali'
    );
    act(() => result.cell('2026-03-21').focus());
    await user.keyboard('{PageDown}');
    expect(result.app.getCurrentDate()).toEqual(new Date(2026, 3, 21));
    await vi.waitFor(() => expect(result.cell('2026-04-21')).toHaveFocus());
  });

  it('navigates when an arrow leaves the visible six-week grid', async () => {
    const user = userEvent.setup();
    const result = mount();
    // March's Monday-first grid ends on April 5, including trailing dates.
    act(() => result.cell('2026-04-05').focus());
    await user.keyboard('{ArrowRight}');
    expect(result.app.getCurrentDate()).toEqual(new Date(2026, 3, 6));
    await vi.waitFor(() => expect(result.cell('2026-04-06')).toHaveFocus());
    expect(result.tabStops()).toHaveLength(1);
  });

  it('uses the default date selection action and keeps the selected cell focused', async () => {
    const user = userEvent.setup();
    const result = mount({ gridDateClick: undefined });
    act(() => result.cell('2026-03-13').focus());
    await user.keyboard('{Enter}');
    expect(result.app.getCurrentDate()).toEqual(new Date(2026, 2, 13));
    expect(result.cell('2026-03-13')).toHaveFocus();
    expect(result.cell('2026-03-13')).toHaveAttribute('aria-selected', 'true');
  });

  it('labels dates in the locale and marks selected/current dates', () => {
    const result = mount({}, new Date(2026, 2, 12), 'fr-FR');
    expect(result.cell('2026-03-12')).toHaveAccessibleName(
      'jeudi 12 mars 2026'
    );
    expect(result.cell('2026-03-12')).toHaveAttribute('aria-selected', 'true');
    expect(result.cell('2026-03-13')).toHaveAttribute('aria-selected', 'false');
    expect(result.cell('2026-03-12').parentElement).toHaveAttribute(
      'role',
      'row'
    );
    result.unmount();
    const today = new Date();
    const current = mount({}, today);
    const marked = current.grid.querySelector('[aria-current="date"]');
    expect(marked).toHaveAttribute('aria-selected', 'true');
    expect(current.grid.querySelectorAll('[aria-current="date"]')).toHaveLength(
      1
    );
  });

  it('retains focus and the roving date on unrelated re-renders', async () => {
    const user = userEvent.setup();
    const result = mount();
    act(() => result.cell('2026-03-12').focus());
    await user.keyboard('{ArrowRight}');
    await act(async () => {
      await result.app.updateEvent('event-0', { title: 'Updated event' });
    });
    expect(result.cell('2026-03-13')).toHaveFocus();
    expect(result.tabStops()[0]).toBe(result.cell('2026-03-13'));
    const after = result.getByRole('button', { name: 'After calendar' });
    after.focus();
    await act(async () => {
      await result.app.updateEvent('event-0', { title: 'Another update' });
    });
    expect(after).toHaveFocus();
  });

  it('keeps one visible tab stop while scrolling and restores a remounted active date', async () => {
    const result = mount();
    const original = result.cell('2026-03-12');
    act(() => original.focus());
    const top = result.grid.scrollTop;
    fireEvent.scroll(result.grid, { target: { scrollTop: top + 121 * 12 } });
    await vi.waitFor(() => expect(original).not.toBeInTheDocument());
    expect(result.tabStops()).toHaveLength(1);
    await vi.waitFor(() =>
      expect(result.tabStops()[0]).toHaveAttribute('data-other-month', 'false')
    );
    fireEvent.scroll(result.grid, { target: { scrollTop: top } });
    await vi.waitFor(() => expect(result.cell('2026-03-12')).toHaveFocus());
    expect(result.tabStops()).toHaveLength(1);
  });

  it('does not reclaim focus after the user leaves a removed row', async () => {
    const result = mount();
    const original = result.cell('2026-03-12');
    act(() => original.focus());
    const top = result.grid.scrollTop;
    fireEvent.scroll(result.grid, { target: { scrollTop: top + 121 * 12 } });
    await vi.waitFor(() => expect(original).not.toBeInTheDocument());
    const after = result.getByRole('button', { name: 'After calendar' });
    after.focus();
    fireEvent.scroll(result.grid, { target: { scrollTop: top } });
    await vi.waitFor(() =>
      expect(result.cell('2026-03-12')).toBeInTheDocument()
    );
    expect(after).toHaveFocus();
  });

  it('uses existing navigation when arrows return to the selected month after scrolling', async () => {
    const user = userEvent.setup();
    const result = mount();
    const top = result.grid.scrollTop;
    fireEvent.scroll(result.grid, { target: { scrollTop: top - 121 * 5 } });
    await vi.waitFor(() =>
      expect(result.tabStops()[0]).toHaveAttribute('data-date', '2026-02-01')
    );
    act(() => result.cell('2026-03-01').focus());
    await user.keyboard('{ArrowDown}');
    expect(result.app.getCurrentDate()).toEqual(new Date(2026, 2, 8));
    await vi.waitFor(() => expect(result.cell('2026-03-08')).toHaveFocus());
    expect(result.grid.scrollTop).toBeGreaterThan(top - 121 * 5);
  });

  it('preserves an event task checkbox tab stop and its key handling', async () => {
    const user = userEvent.setup();
    const result = mount();
    await act(async () => {
      await result.app.updateEvent('event-0', {
        kind: 'task',
        task: { completed: false },
      });
    });
    const day = result.cell('2026-03-12');
    const checkbox = within(day).getByRole('checkbox');
    act(() => day.focus());
    await user.tab();
    expect(checkbox).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(checkbox).toHaveFocus();
    await user.keyboard(' ');
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Enter}');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(result.onGridDateClick).not.toHaveBeenCalled();
    expect(result.onGridDateDoubleClick).not.toHaveBeenCalled();
    expect(result.tabStops()[0]).toBe(day);
  });

  it('leaves keys on events and the continuation untouched', async () => {
    const user = userEvent.setup();
    const result = mount();
    const day = result.cell('2026-03-12');
    const event = day.querySelector<HTMLElement>('[data-event-id]')!;
    for (const target of [
      event,
      within(day).getByRole('button', { name: /more/ }),
    ]) {
      for (const key of [
        'ArrowRight',
        'ArrowDown',
        'Home',
        'End',
        'PageDown',
        'Enter',
        ' ',
      ]) {
        expect(fireEvent.keyDown(target, { key })).toBe(true);
      }
    }
    expect(result.onGridDateClick).not.toHaveBeenCalled();
    expect(result.onGridDateDoubleClick).not.toHaveBeenCalled();
    const more = within(day).getByRole('button', { name: /more/ });
    act(() => day.focus());
    await user.tab();
    expect(more).toHaveFocus();
    await user.keyboard('{ArrowRight}{Enter}');
    expect(more).toHaveFocus();
    expect(result.onMoreEventsClick).toHaveBeenCalledOnce();
    expect(result.onGridDateClick).not.toHaveBeenCalled();
  });
});
