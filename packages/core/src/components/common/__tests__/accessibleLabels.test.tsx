import { RangePicker } from '@dayflow/ui-range-picker';
import { fireEvent, render, screen } from '@testing-library/preact';
import type { ComponentChild } from 'preact';
import { Temporal } from 'temporal-polyfill';

import CalendarHeader from '@/components/common/CalendarHeader';
import { CalendarPicker } from '@/components/common/CalendarPicker';
import { MiniCalendar } from '@/components/common/MiniCalendar';
import { TimeAxisLabel } from '@/components/common/TimeAxisLabel';
import TodayBox from '@/components/common/TodayBox';
import ViewHeader from '@/components/common/ViewHeader';
import { Switch } from '@/components/mobileEventDrawer/components/Switch';
import MobileSearchDialog from '@/components/search/MobileSearchDialog';
import { CalendarApp } from '@/core/CalendarApp';
import { createMonthView } from '@/factories/createMonthView';
import { createWeekView } from '@/factories/createWeekView';
import { LocaleProvider } from '@/locale';

const noop = () => {
  /* noop */
};

const renderWithLocale = (ui: ComponentChild) =>
  render(<LocaleProvider>{ui}</LocaleProvider>);

describe('navigation arrow labels', () => {
  it.each([
    ['day', 'Previous day', 'Next day'],
    ['week', 'Previous week', 'Next week'],
    ['month', 'Previous month', 'Next month'],
    ['year', 'Previous year', 'Next year'],
    ['period', 'Previous period', 'Next period'],
  ] as const)('names the %s arrows by their unit', (unit, previous, next) => {
    renderWithLocale(
      <TodayBox
        handlePreviousMonth={noop}
        handleToday={noop}
        handleNextMonth={noop}
        navigationUnit={unit}
      />
    );

    expect(screen.getByRole('button', { name: previous })).toBeTruthy();
    expect(screen.getByRole('button', { name: next })).toBeTruthy();
  });

  it('derives the unit from the view header type and reads custom messages', () => {
    const app = new CalendarApp({ views: [createWeekView()] });

    render(
      <LocaleProvider
        locale='fr-FR'
        messages={{
          previousWeek: 'Semaine précédente',
          nextWeek: 'Semaine suivante',
        }}
      >
        <ViewHeader
          calendar={app}
          viewType='week'
          currentDate={new Date(2026, 9, 15)}
          onPrevious={noop}
          onNext={noop}
          onToday={noop}
        />
      </LocaleProvider>
    );

    expect(
      screen.getByRole('button', { name: 'Semaine précédente' })
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Semaine suivante' })
    ).toBeTruthy();
  });

  it('localizes the mini calendar month arrows', () => {
    render(
      <LocaleProvider
        messages={{
          previousMonth: 'Mois précédent',
          nextMonth: 'Mois suivant',
        }}
      >
        <MiniCalendar
          visibleMonth={new Date(2026, 9, 1)}
          currentDate={new Date(2026, 9, 15)}
          showHeader
          onMonthChange={noop}
          onDateSelect={noop}
        />
      </LocaleProvider>
    );

    expect(screen.getByRole('button', { name: 'Mois précédent' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mois suivant' })).toBeTruthy();
  });

  it('hides decorative chevrons from assistive technology', () => {
    const { container } = render(
      <TodayBox
        handlePreviousMonth={noop}
        handleToday={noop}
        handleNextMonth={noop}
      />
    );

    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBe(2);
    icons.forEach(icon => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.getAttribute('focusable')).toBe('false');
    });
  });
});

describe('desktop search field', () => {
  it('names the search input and its clear button', () => {
    const app = new CalendarApp({ views: [createMonthView()] });
    const onSearchChange = vi.fn();

    renderWithLocale(
      <CalendarHeader
        calendar={app}
        searchValue='standup'
        onSearchChange={onSearchChange}
      />
    );

    expect(screen.getByRole('textbox', { name: 'Search' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onSearchChange).toHaveBeenCalledWith('');
  });
});

describe('mobile search dialog', () => {
  const renderDialog = (onClose = vi.fn(), isOpen = true) => (
    <LocaleProvider>
      <MobileSearchDialog
        isOpen={isOpen}
        onClose={onClose}
        keyword='standup'
        onSearchChange={noop}
        results={[]}
        loading={false}
      />
    </LocaleProvider>
  );

  it('exposes modal dialog semantics and named controls', () => {
    render(renderDialog());

    const dialog = screen.getByRole('dialog', { name: 'Search' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('button', { name: 'Close search' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeTruthy();
  });

  it('closes on Escape and returns focus to the opener', () => {
    const opener = document.createElement('input');
    document.body.append(opener);
    opener.focus();

    const onClose = vi.fn();
    const { rerender } = render(renderDialog(onClose));

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(renderDialog(onClose, false));
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('other unnamed controls', () => {
  it('names mini calendar days with their full date and marks today', () => {
    renderWithLocale(
      <MiniCalendar
        visibleMonth={new Date(2026, 9, 1)}
        currentDate={new Date(2026, 9, 15)}
        onMonthChange={noop}
        onDateSelect={noop}
      />
    );

    const selected = screen.getByRole('button', {
      name: 'Thursday, October 15, 2026',
    });
    expect(selected.getAttribute('aria-pressed')).toBe('true');
  });

  it('names the desktop calendar picker trigger after the selected calendar', () => {
    renderWithLocale(
      <CalendarPicker
        options={[{ label: 'Work', value: 'work' }]}
        value='work'
        onChange={noop}
      />
    );

    const trigger = screen.getByRole('button', { name: 'Calendar: Work' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('passes a label through to the switch', () => {
    render(<Switch checked={false} onChange={noop} label='All day' />);
    expect(screen.getByRole('switch', { name: 'All day' })).toBeTruthy();
  });

  it('localizes the noon axis label', () => {
    render(
      <LocaleProvider messages={{ noon: 'Midi' }}>
        <TimeAxisLabel hour={12} timeFormat='12h' />
      </LocaleProvider>
    );
    expect(screen.getByText('Midi')).toBeTruthy();
  });
});

describe('range picker labels', () => {
  const value: [Temporal.PlainDate, Temporal.PlainDate] = [
    Temporal.PlainDate.from('2026-10-15'),
    Temporal.PlainDate.from('2026-10-16'),
  ];

  it('falls back to English names for its inputs and navigation', () => {
    render(<RangePicker value={value} timeZone='UTC' />);

    expect(screen.getByRole('textbox', { name: 'Start date' })).toBeTruthy();
    fireEvent.click(screen.getByRole('textbox', { name: 'End date' }));
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeTruthy();
    expect(screen.getByRole('listbox', { name: 'Hour' })).toBeTruthy();
  });

  it('reads translated labels from locale messages', () => {
    render(
      <RangePicker
        value={value}
        timeZone='UTC'
        locale={{
          code: 'fr-FR',
          messages: { startDate: 'Date de début', nextMonth: 'Mois suivant' },
        }}
      />
    );

    fireEvent.click(screen.getByRole('textbox', { name: 'Date de début' }));
    expect(screen.getByRole('button', { name: 'Mois suivant' })).toBeTruthy();
  });
});
