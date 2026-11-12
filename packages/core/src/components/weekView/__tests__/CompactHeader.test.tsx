import { fireEvent, render, screen } from '@testing-library/preact';

import { CompactHeader } from '@/components/weekView/CompactHeader';
import { CalendarApp } from '@/core/CalendarApp';
import { LocaleProvider } from '@/locale';
import { ViewType } from '@/types';

const weekDates = Array.from({ length: 7 }, (_, i) => {
  const fullDate = new Date(2026, 4, 11 + i);
  return {
    date: fullDate.getDate(),
    month: 'May',
    fullDate,
    isToday: i === 2,
    isCurrent: i === 0,
    dayName: fullDate.toLocaleDateString('en-US', { weekday: 'short' }),
  };
});

describe('CompactHeader', () => {
  it('renders each date as a named, keyboard-operable button', () => {
    const app = new CalendarApp({
      views: [],
      plugins: [],
      events: [],
      defaultView: ViewType.WEEK,
      initialDate: new Date(2026, 4, 11),
    });
    const onDateChange = vi.fn();

    render(
      <LocaleProvider>
        <CompactHeader
          app={app}
          fullWeekDates={weekDates}
          mobilePageStart={weekDates[0]!.fullDate}
          onDateChange={onDateChange}
        />
      </LocaleProvider>
    );

    const selected = screen.getByRole('button', {
      name: 'Monday, May 11, 2026',
    });
    expect(selected.getAttribute('aria-pressed')).toBe('true');

    const today = screen.getByRole('button', {
      name: 'Wednesday, May 13, 2026',
    });
    expect(today.getAttribute('aria-current')).toBe('date');
    expect(today.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(today);
    expect(onDateChange).toHaveBeenCalledWith(weekDates[2]!.fullDate);
  });
});
