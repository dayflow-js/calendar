import { LocaleProvider } from '@dayflow/core';
import { DeleteCalendarDialog } from '@sidebar/components/DeleteCalendarDialog';
import { CreateGroupDialog } from '@sidebar/components/GroupDialogs';
import { SubscribeCalendarDialog } from '@sidebar/components/SubscribeCalendarDialog';
import { render, screen, fireEvent } from '@testing-library/preact';
import type { ComponentChild } from 'preact';
import { describe, it, expect, vi } from 'vitest';

const colors = {
  eventColor: '#dbeafe',
  eventSelectedColor: '#bfdbfe',
  lineColor: '#3b82f6',
  textColor: '#1e3a8a',
};

const calendars = [
  { id: 'work', name: 'Work', colors, isVisible: true },
  { id: 'home', name: 'Home', colors, isVisible: true },
];

const renderWithLocale = (ui: ComponentChild) =>
  render(<LocaleProvider>{ui}</LocaleProvider>);

const pressEscape = () =>
  fireEvent.keyDown(document.activeElement ?? document.body, {
    key: 'Escape',
  });

describe('sidebar dialog keyboard handling', () => {
  it('focuses into the group dialog, traps Tab and closes on Escape', () => {
    const onCancel = vi.fn();
    renderWithLocale(
      <CreateGroupDialog
        existingGroupNames={[]}
        onCreate={vi.fn()}
        onCancel={onCancel}
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);

    const buttons = Array.from(
      dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
    );
    const lastButton = buttons.at(-1)!;
    lastButton.focus();
    fireEvent.keyDown(lastButton, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(lastButton);

    pressEscape();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('closes the subscribe dialog on Escape', () => {
    const onCancel = vi.fn();
    renderWithLocale(
      <SubscribeCalendarDialog onSubscribe={vi.fn()} onCancel={onCancel} />
    );
    pressEscape();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('closes the merge dropdown before the delete dialog on Escape', () => {
    const onCancel = vi.fn();
    renderWithLocale(
      <DeleteCalendarDialog
        calendarId='work'
        calendarName='Work'
        calendars={calendars}
        step='initial'
        onStepChange={vi.fn()}
        onConfirmDelete={vi.fn()}
        onCancel={onCancel}
        onMergeSelect={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Merge' }));
    expect(screen.queryByText('Home')).not.toBeNull();

    pressEscape();
    expect(screen.queryByText('Home')).toBeNull();
    expect(onCancel).not.toHaveBeenCalled();

    pressEscape();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
