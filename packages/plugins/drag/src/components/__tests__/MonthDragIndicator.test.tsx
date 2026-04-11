import { LocaleProvider } from '@dayflow/core';
import MonthDragIndicatorComponent from '@drag/components/MonthDragIndicator';
import { render } from 'preact';
import { Temporal } from 'temporal-polyfill';

describe('MonthDragIndicatorComponent', () => {
  it('keeps long all-day titles clipped within the drag indicator width', () => {
    const container = document.createElement('div');
    document.body.append(container);

    const event = {
      id: 'event-1',
      title:
        'An extremely long all-day event title that should stay clipped inside the month drag indicator',
      allDay: true,
      start: Temporal.PlainDate.from('2026-04-11'),
      end: Temporal.PlainDate.from('2026-04-11'),
      calendarId: 'default',
    };

    render(
      <LocaleProvider locale='en'>
        <MonthDragIndicatorComponent
          event={event}
          isCreating={false}
          targetDate={new Date('2026-04-11T00:00:00.000Z')}
        />
      </LocaleProvider>,
      container
    );

    const root = container.firstElementChild as HTMLElement | null;
    const title = Array.from(container.querySelectorAll('div'))
      .toReversed()
      .find(element =>
        element.textContent?.includes('An extremely long all-day event title')
      ) as HTMLElement | undefined;

    expect(root).not.toBeNull();
    expect(root?.className).toContain('w-full');
    expect(root?.className).toContain('min-w-0');
    expect(root?.className).toContain('overflow-hidden');
    expect(title).toBeDefined();
    expect(title?.className).toContain('truncate');
    expect(title?.className).toContain('overflow-hidden');
    expect(title?.className).toContain('whitespace-nowrap');

    render(null, container);
    container.remove();
  });
});
