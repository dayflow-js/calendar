import { fireEvent, render, screen } from '@testing-library/preact';
import type { ComponentChild } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import { CalendarPicker } from '@/components/common/CalendarPicker';
import DefaultEventDetailDialog from '@/components/common/DefaultEventDetailDialog';
import { MobileEventDrawer } from '@/components/mobileEventDrawer/DefaultMobileEventDrawer';
import { CalendarApp } from '@/core/CalendarApp';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { LocaleProvider } from '@/locale';
import { Event, ViewType } from '@/types';

const renderWithLocale = (ui: ComponentChild) =>
  render(<LocaleProvider>{ui}</LocaleProvider>);

const pressKey = (key: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });

const TestDialog = ({
  onClose,
  trapFocus,
  children,
}: {
  onClose: () => void;
  trapFocus?: boolean;
  children?: ComponentChild;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, { onClose, trapFocus });
  return (
    <div ref={ref} role='dialog' aria-modal='true' aria-label='Test dialog'>
      <button type='button'>First</button>
      <input aria-label='Middle' />
      <button type='button'>Last</button>
      {children}
    </div>
  );
};

const DialogHost = ({
  onClose,
  trapFocus,
}: {
  onClose?: () => void;
  trapFocus?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type='button' onClick={() => setOpen(true)}>
        Open
      </button>
      <button type='button'>Outside</button>
      {open && (
        <TestDialog
          trapFocus={trapFocus}
          onClose={() => {
            onClose?.();
            setOpen(false);
          }}
        />
      )}
    </>
  );
};

describe('useDialogFocus', () => {
  it('moves focus in on open and returns it to the opener on Escape', () => {
    const onClose = vi.fn();
    render(<DialogHost onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);

    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();

    pressKey('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('wraps Tab and Shift+Tab inside a modal dialog', () => {
    render(<DialogHost />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });

    last.focus();
    pressKey('Tab');
    expect(first).toHaveFocus();

    pressKey('Tab', { shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('leaves Tab alone when focus is not trapped', () => {
    render(<DialogHost trapFocus={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const last = screen.getByRole('button', { name: 'Last' });
    last.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    last.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('only closes the innermost dialog on Escape', () => {
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    render(
      <TestDialog onClose={outerClose}>
        <TestDialog onClose={innerClose} />
      </TestDialog>
    );

    pressKey('Escape');
    expect(innerClose).toHaveBeenCalledTimes(1);
    expect(outerClose).not.toHaveBeenCalled();
  });

  it('ignores keys coming from popups portalled outside the dialog', () => {
    const onClose = vi.fn();
    render(<TestDialog onClose={onClose} />);
    const popupInput = document.createElement('input');
    document.body.append(popupInput);
    popupInput.focus();

    fireEvent.keyDown(popupInput, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    popupInput.remove();
  });
});

describe('CalendarPicker keyboard listbox', () => {
  const options = [
    { label: 'Work', value: 'work', group: 'Google' },
    { label: 'Personal', value: 'personal', group: 'Google' },
    { label: 'Home', value: 'home' },
  ];

  const renderPicker = (onChange = vi.fn()) => {
    renderWithLocale(
      <CalendarPicker options={options} value='personal' onChange={onChange} />
    );
    return {
      onChange,
      trigger: screen.getByRole('button', { name: 'Calendar: Personal' }),
    };
  };

  const activeOption = () => {
    const listbox = screen.getByRole('listbox');
    const id = listbox.getAttribute('aria-activedescendant');
    return (
      Array.from(listbox.querySelectorAll('[role="option"]')).find(
        option => option.id === id
      ) ?? null
    );
  };

  it('exposes listbox semantics on the trigger and options', () => {
    const { trigger } = renderPicker();
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    const listbox = screen.getByRole('listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', listbox.id);
    expect(screen.getByRole('group', { name: 'Google' })).toBeInTheDocument();

    const selected = screen.getByRole('option', { name: 'Personal' });
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Work' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    // Existing CSS hooks are kept.
    expect(selected).toHaveClass('df-calendar-picker-option');
    expect(selected).toHaveAttribute('data-selected', 'true');
  });

  it('opens with ArrowDown, focuses the listbox and starts on the selected option', () => {
    const { trigger } = renderPicker();
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveFocus();
    expect(activeOption()).toHaveTextContent('Personal');
  });

  it('moves with arrows, Home and End, and picks with Enter', () => {
    const { trigger, onChange } = renderPicker();
    trigger.focus();
    fireEvent.click(trigger);

    // Rendered order: ungrouped first, then the Google group.
    expect(activeOption()).toHaveTextContent('Personal');
    pressKey('ArrowDown');
    expect(activeOption()).toHaveTextContent('Personal');
    pressKey('ArrowUp');
    expect(activeOption()).toHaveTextContent('Work');
    pressKey('Home');
    expect(activeOption()).toHaveTextContent('Home');
    pressKey('ArrowUp');
    expect(activeOption()).toHaveTextContent('Home');
    pressKey('End');
    expect(activeOption()).toHaveTextContent('Personal');
    pressKey('ArrowUp');
    expect(activeOption()).toHaveTextContent('Work');
    expect(activeOption()).toHaveAttribute('data-active', 'true');

    pressKey('Enter');
    expect(onChange).toHaveBeenCalledWith('work');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('picks with Space', () => {
    const { trigger, onChange } = renderPicker();
    fireEvent.click(trigger);
    pressKey('Home');
    pressKey(' ');
    expect(onChange).toHaveBeenCalledWith('home');
  });

  it('closes on Escape without closing an enclosing dialog', () => {
    const onClose = vi.fn();
    const Host = () => {
      const ref = useRef<HTMLDivElement>(null);
      useDialogFocus(ref, { onClose });
      return (
        <div ref={ref} role='dialog'>
          <CalendarPicker options={options} value='work' onChange={vi.fn()} />
        </div>
      );
    };
    renderWithLocale(<Host />);
    const trigger = screen.getByRole('button', { name: 'Calendar: Work' });
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toHaveFocus();

    pressKey('Escape');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();

    pressKey('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

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

describe('event dialogs', () => {
  beforeAll(() => {
    window.scrollTo = vi.fn();
  });

  it('closes the event detail dialog on Escape', () => {
    const onClose = vi.fn();
    renderWithLocale(
      <DefaultEventDetailDialog
        event={event}
        isOpen
        isAllDay={false}
        onEventUpdate={vi.fn()}
        onEventDelete={vi.fn()}
        onClose={onClose}
        app={createApp()}
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);

    pressKey('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the mobile drawer on Escape and names its date/time triggers by row', () => {
    const onClose = vi.fn();
    const app = createApp();
    renderWithLocale(
      <MobileEventDrawer
        isOpen
        onClose={onClose}
        onSave={vi.fn()}
        onEventDelete={vi.fn()}
        draftEvent={app.getEvents()[0]}
        app={app}
      />
    );

    const starts = screen.getAllByRole('button', { name: /^Starts / });
    const ends = screen.getAllByRole('button', { name: /^Ends / });
    // Date + time for each row.
    expect(starts).toHaveLength(2);
    expect(ends).toHaveLength(2);
    expect(starts[0]).toHaveAccessibleName(
      `Starts ${starts[0].textContent?.trim()}`
    );

    pressKey('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
