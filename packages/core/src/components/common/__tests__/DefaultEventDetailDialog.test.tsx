import { fireEvent, render, screen } from '@testing-library/preact';
import { Temporal } from 'temporal-polyfill';

import DefaultEventDetailDialog from '@/components/common/DefaultEventDetailDialog';
import { CalendarApp } from '@/core/CalendarApp';
import { LocaleProvider } from '@/locale';
import { Event, ViewType } from '@/types';

const event: Event = {
  id: 'event-1',
  title: 'Planning',
  calendarId: 'work',
  allDay: false,
  start: Temporal.ZonedDateTime.from(
    '2026-04-17T09:00:00+10:00[Australia/Sydney]'
  ),
  end: Temporal.ZonedDateTime.from(
    '2026-04-17T10:00:00+10:00[Australia/Sydney]'
  ),
};

const createApp = () =>
  new CalendarApp({
    views: [],
    plugins: [],
    defaultView: ViewType.MONTH,
    events: [event],
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

const renderDialog = (app?: CalendarApp, onEventUpdate = vi.fn()) =>
  render(
    <LocaleProvider>
      <DefaultEventDetailDialog
        event={event}
        isOpen
        isAllDay={false}
        onEventUpdate={onEventUpdate}
        onEventDelete={vi.fn()}
        onClose={vi.fn()}
        app={app}
      />
    </LocaleProvider>
  );

// The dialog portals into document.body, so query the document, not the container.
const dialogIsShown = () =>
  document.querySelector('[data-event-detail-dialog]') !== null;

describe('DefaultEventDetailDialog', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ReadOnlyConfig.viewable is optional and means "allowed" when unset. Treating
  // an unset value as false hid the dialog whenever the config omitted it.
  it('opens when no app is provided', () => {
    renderDialog();
    expect(dialogIsShown()).toBe(true);
  });

  it('opens when the read-only config leaves viewable unset', () => {
    const app = createApp();
    vi.spyOn(app, 'getReadOnlyConfig').mockReturnValue({});
    renderDialog(app);
    expect(dialogIsShown()).toBe(true);
  });

  it('stays closed when viewable is explicitly false', () => {
    const app = createApp();
    vi.spyOn(app, 'getReadOnlyConfig').mockReturnValue({ viewable: false });
    renderDialog(app);
    expect(dialogIsShown()).toBe(false);
  });

  it('switches to a task with a single due time and saves it', async () => {
    const onEventUpdate = vi.fn();
    renderDialog(createApp(), onEventUpdate);

    expect(document.querySelector('.df-event-conference-field')).not.toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Task' }));

    expect(screen.getByRole('radio', { name: 'Task' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByText('Due')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(document.querySelector('.df-event-conference-field')).toBeNull();
    expect(document.querySelector('input[name="range-start"]')).not.toBeNull();
    expect(document.querySelector('input[name="range-end"]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await vi.waitFor(() => expect(onEventUpdate).toHaveBeenCalledTimes(1));
    const saved = onEventUpdate.mock.calls[0][0] as Event;
    expect(saved.kind).toBe('task');
    expect(saved.end.toString()).toBe(saved.start.toString());
  });
});
