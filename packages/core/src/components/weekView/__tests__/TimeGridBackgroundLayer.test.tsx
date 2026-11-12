import { fireEvent, render, screen } from '@testing-library/preact';
import { Temporal } from 'temporal-polyfill';

import {
  calculateAnchoredRange,
  TimeGridBackgroundLayer,
} from '@/components/weekView/TimeGridBackgroundLayer';
import { LocaleProvider } from '@/locale';
import { ViewType } from '@/types';
import type {
  CalendarPlugin,
  ICalendarApp,
  TimeGridBackgroundSource,
} from '@/types';

const start = Temporal.ZonedDateTime.from(
  '2026-08-03T09:00:00+10:00[Australia/Sydney]'
);
const end = start.add({ hours: 1 });

function setup(sourceUpdates: Partial<TimeGridBackgroundSource> = {}) {
  const source: TimeGridBackgroundSource = {
    id: 'availability',
    editable: true,
    snapMinutes: 15,
    getRanges: () => [
      {
        id: 'range-1',
        start,
        end,
        title: '09:00 · Available',
        ariaLabel: 'Monday availability',
        editable: true,
      },
    ],
    ...sourceUpdates,
  };
  const plugin: CalendarPlugin = {
    name: 'test-background',
    install: () => {
      // No installation work is needed for this isolated renderer test.
    },
    timeGridBackground: source,
  };
  const app = {
    timeZone: 'Australia/Sydney',
    state: {
      plugins: new Map([[plugin.name, plugin]]),
      currentDate: new Date(2026, 7, 3),
    },
    triggerRender: vi.fn(),
  } as unknown as ICalendarApp;

  render(
    <LocaleProvider>
      <TimeGridBackgroundLayer
        app={app}
        view={ViewType.WEEK}
        visibleDates={Array.from({ length: 7 }, (_, index) =>
          Temporal.PlainDate.from('2026-08-03').add({ days: index })
        )}
        timeZone='Australia/Sydney'
        hourHeight={60}
        firstHour={0}
        lastHour={24}
        sources={[source]}
      />
    </LocaleProvider>
  );
  return { app, source };
}

describe('TimeGridBackgroundLayer', () => {
  it('renders a plugin range as an independent accessible layer', () => {
    setup();
    const range = screen.getByRole('button', {
      name: 'Monday availability',
    });
    expect(range).toBeInTheDocument();
    expect(range.style.width).toBe(`${100 / 7}%`);
  });

  it('moves a selected range by the configured keyboard snap', () => {
    const onRangeChange = vi.fn();
    setup({ onRangeChange });
    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
    expect(onRangeChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'range-1' }),
      expect.objectContaining({ hour: 9, minute: 15 }),
      expect.objectContaining({ hour: 10, minute: 15 }),
      'keyboard-move'
    );
  });

  it('deletes the focused range without involving EventManager', () => {
    const onRangeDelete = vi.fn();
    setup({ onRangeDelete });
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Monday availability' }),
      { key: 'Delete' }
    );
    expect(onRangeDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'range-1' })
    );
  });

  it('deletes a titled editable range from its visible close button', () => {
    const onRangeDelete = vi.fn();
    setup({ onRangeDelete });
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove slot: 09:00 · Available' })
    );
    expect(onRangeDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'range-1' })
    );
  });

  it('renders appointment-sized segments inside an editable range', () => {
    setup({
      getRanges: () => [
        {
          id: 'range-1',
          start,
          end: start.add({ hours: 8 }),
          title: 'Product demo',
          editable: true,
          segmentMinutes: 60,
          segmentAvailability: [
            true,
            false,
            true,
            true,
            true,
            true,
            true,
            true,
          ],
        },
      ],
    });
    expect(
      document.querySelectorAll('.df-time-grid-background-range-segment')
    ).toHaveLength(8);
    expect(
      document.querySelectorAll(
        '.df-time-grid-background-range-segment-unavailable'
      )
    ).toHaveLength(1);
    expect(screen.getByText('Product demo')).toBeInTheDocument();
  });

  it('renders a compact bar with hover-card content', () => {
    setup({
      editable: false,
      getRanges: () => [
        {
          id: 'range-1',
          start,
          end,
          title: 'Product demo',
          variant: 'bar',
          backgroundColor: '#7c3aed',
          hoverCard: { title: 'Product demo', detail: '09:00–10:00' },
        },
      ],
    });
    const range = screen.getByRole('button');
    expect(range.style.width).toBe('3px');
    expect(range.style.left).toBe('0%');
    expect(range.style.transform).toBe('');
    expect(range.style.backgroundColor).toBe('rgb(124, 58, 237)');
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Product demo09:00–10:00'
    );
  });

  it('centres later compact bars without clipping the first day bar', () => {
    setup({
      editable: false,
      getRanges: () => [
        {
          id: 'range-1',
          start: start.add({ days: 1 }),
          end: end.add({ days: 1 }),
          variant: 'bar',
        },
      ],
    });
    const range = screen.getByRole('button');
    expect(range.style.left).toBe(`${100 / 7}%`);
    expect(range.style.transform).toBe('translateX(-50%)');
  });

  it('resizes from the original pointer anchor without accumulating movement', () => {
    const input = {
      mode: 'resize-end' as const,
      originStartMinutes: 9 * 60,
      originEndMinutes: 10 * 60,
      deltaMinutes: 15,
      gridStart: 0,
      gridEnd: 24 * 60,
      minimumDuration: 15,
    };
    const firstMove = calculateAnchoredRange(input);
    const samePointerPosition = calculateAnchoredRange(input);
    expect(firstMove).toEqual({
      startMinutes: 9 * 60,
      endMinutes: 10 * 60 + 15,
    });
    expect(samePointerPosition).toEqual(firstMove);
  });

  it('keeps a range ending at 24:00 on the next-day midnight boundary', () => {
    const onRangeChange = vi.fn();
    const lateStart = start.with({ hour: 23, minute: 0 });
    setup({
      onRangeChange,
      getRanges: () => [
        {
          id: 'range-1',
          start: lateStart,
          end: lateStart.add({ hours: 1 }),
          editable: true,
        },
      ],
    });

    fireEvent.keyDown(screen.getByRole('button'), {
      key: 'ArrowDown',
      shiftKey: true,
    });

    const updatedEnd = onRangeChange.mock.calls[0]?.[2];
    expect(updatedEnd.toPlainDate().toString()).toBe('2026-08-04');
    expect(updatedEnd.toPlainTime().toString()).toBe('00:00:00');
  });
});
