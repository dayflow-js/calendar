import { LocaleProvider } from '@dayflow/core';
import { DeleteCalendarDialog } from '@sidebar/components/DeleteCalendarDialog';
import { ImportCalendarDialog } from '@sidebar/components/ImportCalendarDialog';
import { render, screen, fireEvent, within } from '@testing-library/preact';
import type { ComponentChild } from 'preact';
import { describe, it, expect, vi } from 'vitest';

const colors = {
  eventColor: '#dbeafe',
  eventSelectedColor: '#bfdbfe',
  lineColor: '#3b82f6',
  textColor: '#1e3a8a',
};

const calendars = [
  { id: 'work', name: 'Work', source: 'Google', colors, isVisible: true },
  { id: 'home', name: 'Home', source: 'iCloud', colors, isVisible: true },
  { id: 'misc', name: 'Misc', colors, isVisible: true },
];

const renderWithLocale = (ui: ComponentChild) =>
  render(<LocaleProvider>{ui}</LocaleProvider>);

const key = (k: string) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key: k });

const activeOption = (listbox: HTMLElement) => {
  const id = listbox.getAttribute('aria-activedescendant');
  return id ? document.querySelector<HTMLElement>(`[id="${id}"]`) : null;
};

const renderImport = (onCancel = vi.fn(), onConfirm = vi.fn()) =>
  renderWithLocale(
    <ImportCalendarDialog
      calendars={calendars}
      filename='schedule.ics'
      groups={['Google', 'iCloud']}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );

const renderDelete = (onMergeSelect = vi.fn(), onCancel = vi.fn()) =>
  renderWithLocale(
    <DeleteCalendarDialog
      calendarId='misc'
      calendarName='Misc'
      calendars={calendars}
      groups={['Google', 'iCloud']}
      step='initial'
      onStepChange={vi.fn()}
      onConfirmDelete={vi.fn()}
      onCancel={onCancel}
      onMergeSelect={onMergeSelect}
    />
  );

describe('ImportCalendarDialog target listbox', () => {
  it('exposes listbox semantics on the trigger and options', () => {
    const { container } = renderImport();
    const trigger = container.querySelector<HTMLButtonElement>(
      '.df-sidebar-select-trigger'
    )!;
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('aria-controls')).toBe(false);

    fireEvent.click(trigger);
    const listbox = screen.getByRole('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(listbox.id);
    expect(document.activeElement).toBe(listbox);

    const options = within(listbox).getAllByRole('option');
    // Misc (ungrouped), Work (Google), Home (iCloud), New Calendar
    expect(options.map(o => o.textContent)).toEqual([
      'Misc',
      'Work',
      'Home',
      expect.stringContaining('schedule.ics'),
    ]);
    expect(options[0].getAttribute('aria-selected')).toBe('false');
    expect(options[1].getAttribute('aria-selected')).toBe('true');
    expect(within(listbox).getAllByRole('group')).toHaveLength(2);
    expect(within(listbox).getByRole('group', { name: 'Google' })).toBeTruthy();

    // Opens on the selected option.
    expect(activeOption(listbox)).toBe(options[1]);
    expect(options[1].dataset.active).toBe('true');
  });

  it('moves with arrows/Home/End and picks with Enter', () => {
    const { container } = renderImport();
    const trigger = container.querySelector<HTMLButtonElement>(
      '.df-sidebar-select-trigger'
    )!;
    trigger.focus();
    key('ArrowDown');
    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    key('ArrowDown');
    expect(activeOption(listbox)).toBe(options[2]);
    key('End');
    expect(activeOption(listbox)).toBe(options[3]);
    key('ArrowDown');
    expect(activeOption(listbox)).toBe(options[3]);
    key('Home');
    expect(activeOption(listbox)).toBe(options[0]);
    key('ArrowUp');
    expect(activeOption(listbox)).toBe(options[0]);
    key('ArrowDown');
    key('ArrowDown');

    key('Enter');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.textContent).toContain('Home');
  });

  it('picks with Space and confirms the chosen calendar', () => {
    const onConfirm = vi.fn();
    const { container } = renderImport(vi.fn(), onConfirm);
    const trigger = container.querySelector<HTMLButtonElement>(
      '.df-sidebar-select-trigger'
    )!;
    trigger.focus();
    key('ArrowUp');
    expect(activeOption(screen.getByRole('listbox'))?.textContent).toContain(
      'schedule.ics'
    );
    key(' ');
    expect(trigger.textContent).toContain('schedule.ics');

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onConfirm).toHaveBeenCalledWith('new-calendar');
  });

  it('closes only the dropdown on Escape and returns focus', () => {
    const onCancel = vi.fn();
    const { container } = renderImport(onCancel);
    const trigger = container.querySelector<HTMLButtonElement>(
      '.df-sidebar-select-trigger'
    )!;
    fireEvent.click(trigger);
    expect(screen.queryByRole('listbox')).not.toBeNull();

    key('Escape');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(onCancel).not.toHaveBeenCalled();

    key('Escape');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('DeleteCalendarDialog merge listbox', () => {
  it('selects a merge target from the keyboard', async () => {
    const onMergeSelect = vi.fn();
    renderDelete(onMergeSelect);
    const trigger = screen.getByRole('button', { name: 'Merge' });
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.focus();
    key('ArrowDown');
    const listbox = screen.getByRole('listbox', { name: 'Merge' });
    expect(trigger.getAttribute('aria-controls')).toBe(listbox.id);
    expect(document.activeElement).toBe(listbox);

    const options = within(listbox).getAllByRole('option');
    expect(options.map(o => o.textContent)).toEqual(['Work', 'Home']);
    expect(
      options.every(o => o.getAttribute('aria-selected') === 'false')
    ).toBe(true);
    expect(activeOption(listbox)).toBe(options[0]);

    key('ArrowDown');
    expect(activeOption(listbox)).toBe(options[1]);
    key('Enter');
    expect(onMergeSelect).toHaveBeenCalledWith('home');

    // The merge is async; once it settles the dropdown closes and focus goes
    // back to the trigger instead of dropping to <body>.
    await vi.waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Merge' })
      )
    );
  });

  it('closes only the dropdown on Escape and returns focus', () => {
    const onCancel = vi.fn();
    renderDelete(vi.fn(), onCancel);
    const trigger = screen.getByRole('button', { name: 'Merge' });
    fireEvent.click(trigger);
    expect(document.activeElement).toBe(screen.getByRole('listbox'));

    key('Escape');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('highlights options on mouse move and picks on click', () => {
    const onMergeSelect = vi.fn();
    renderDelete(onMergeSelect);
    fireEvent.click(screen.getByRole('button', { name: 'Merge' }));
    const listbox = screen.getByRole('listbox');
    const [, home] = within(listbox).getAllByRole('option');
    fireEvent.mouseMove(home);
    expect(home.dataset.active).toBe('true');
    fireEvent.click(home);
    expect(onMergeSelect).toHaveBeenCalledWith('home');
  });
});
