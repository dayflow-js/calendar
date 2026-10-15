import { fireEvent, render, screen } from '@testing-library/preact';
import { Temporal } from 'temporal-polyfill';

import { MobileEventDrawer } from '@/components/mobileEventDrawer/DefaultMobileEventDrawer';
import { CalendarApp } from '@/core/CalendarApp';
import { LocaleProvider } from '@/locale';
import { ViewType } from '@/types';

const createApp = () =>
  new CalendarApp({
    views: [],
    plugins: [],
    defaultView: ViewType.MONTH,
    events: [
      {
        id: 'event-1',
        title: 'Existing event',
        description: 'Saved notes',
        calendarId: 'work',
        allDay: false,
        start: Temporal.ZonedDateTime.from(
          '2026-04-17T09:00:00+10:00[Australia/Sydney]'
        ),
        end: Temporal.ZonedDateTime.from(
          '2026-04-17T10:00:00+10:00[Australia/Sydney]'
        ),
      },
    ],
    calendars: [
      {
        id: 'work',
        name: 'Work',
        colors: {
          lineColor: '#2563eb',
          eventColor: '#dbeafe',
          eventSelectedColor: '#bfdbfe',
          textColor: '#1e3a8a',
        },
      },
    ],
    timeZone: 'Australia/Sydney',
  });

describe('MobileEventDrawer', () => {
  beforeAll(() => {
    window.scrollTo = vi.fn();
  });

  it('hydrates notes and toggles start date expander state', () => {
    const app = createApp();
    const draftEvent = {
      ...app.getEvents()[0],
      description: 'Saved notes',
    };

    render(
      <MobileEventDrawer
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        onEventDelete={vi.fn()}
        draftEvent={draftEvent}
        app={app}
      />
    );

    expect(screen.getByDisplayValue('Saved notes')).toBeInTheDocument();

    const [startDateButton] = screen.getAllByRole('button', {
      name: /Apr 17, 2026/i,
    });
    fireEvent.click(startDateButton);

    const expandedCalendar = document.querySelector(
      '.df-mobile-event-drawer-expander[data-kind="calendar"][data-expanded="true"]'
    );

    expect(expandedCalendar).not.toBeNull();
  });

  it('locks background scroll when open and restores it when closed', () => {
    const app = createApp();
    const draftEvent = app.getEvents()[0];

    const { unmount } = render(
      <MobileEventDrawer
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        onEventDelete={vi.fn()}
        draftEvent={draftEvent}
        app={app}
      />
    );

    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.position).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(window.scrollTo).toHaveBeenCalled();
  });

  // ReadOnlyConfig.viewable is optional and means "allowed" when unset;
  // only an explicit false should keep the drawer from opening.
  it('opens when the read-only config leaves viewable unset', () => {
    const app = createApp();
    vi.spyOn(app, 'getReadOnlyConfig').mockReturnValue({});

    render(
      <MobileEventDrawer
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        onEventDelete={vi.fn()}
        draftEvent={app.getEvents()[0]}
        app={app}
      />
    );

    expect(document.querySelector('.df-mobile-event-drawer')).not.toBeNull();
  });

  it('stays closed when viewable is explicitly false', () => {
    const app = createApp();
    vi.spyOn(app, 'getReadOnlyConfig').mockReturnValue({ viewable: false });

    render(
      <MobileEventDrawer
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        onEventDelete={vi.fn()}
        draftEvent={app.getEvents()[0]}
        app={app}
      />
    );

    expect(document.querySelector('.df-mobile-event-drawer')).toBeNull();
  });

  it('saves a task without an end time, keeping edited notes', () => {
    const app = createApp();
    const onSave = vi.fn();

    render(
      <LocaleProvider>
        <MobileEventDrawer
          isOpen
          onClose={vi.fn()}
          onSave={onSave}
          onEventDelete={vi.fn()}
          draftEvent={app.getEvents()[0]}
          app={app}
        />
      </LocaleProvider>
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Task' }));
    expect(screen.queryByText('Ends')).toBeNull();
    expect(screen.getByText('Due')).toBeInTheDocument();
    expect(screen.getByText('Edit Task')).toBeInTheDocument();

    fireEvent.input(screen.getByDisplayValue('Saved notes'), {
      target: { value: 'Bring slides' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(saved.kind).toBe('task');
    expect(saved.end.toString()).toBe(saved.start.toString());
    expect(saved.description).toBe('Bring slides');
  });

  it('gives a task an hour again when switched back to an event', () => {
    const app = createApp();
    const onSave = vi.fn();
    const stored = app.getEvents()[0];

    render(
      <LocaleProvider>
        <MobileEventDrawer
          isOpen
          onClose={vi.fn()}
          onSave={onSave}
          onEventDelete={vi.fn()}
          draftEvent={{ ...stored, kind: 'task', end: stored.start }}
          app={app}
        />
      </LocaleProvider>
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Event' }));
    expect(screen.getByText('Ends')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    const saved = onSave.mock.calls[0][0];
    expect(saved.kind).toBeUndefined();
    expect(saved.task).toBeUndefined();
    expect(saved.end.toString()).toBe(stored.end.toString());
  });
});
