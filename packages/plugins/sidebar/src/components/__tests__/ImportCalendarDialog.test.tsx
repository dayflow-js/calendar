import { LocaleProvider } from '@dayflow/core';
import { ImportCalendarDialog } from '@sidebar/components/ImportCalendarDialog';
import { render, screen, fireEvent, within } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';

const colors = {
  eventColor: '#dbeafe',
  eventSelectedColor: '#bfdbfe',
  lineColor: '#3b82f6',
  textColor: '#1e3a8a',
};

const mockCalendars = [
  { id: 'work', name: 'Work', source: 'Google', colors, isVisible: true },
  {
    id: 'personal',
    name: 'Personal',
    source: 'Google',
    colors,
    isVisible: true,
  },
  { id: 'home', name: 'Home', source: 'iCloud', colors, isVisible: true },
  { id: 'misc', name: 'Misc', colors, isVisible: true },
];

describe('ImportCalendarDialog', () => {
  it('renders dropdown with group headers when calendars have groups', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { container } = render(
      <LocaleProvider>
        <ImportCalendarDialog
          calendars={mockCalendars}
          filename='schedule.ics'
          groups={['Google', 'iCloud']}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </LocaleProvider>
    );

    // Dialog title
    expect(screen.getByText('Add Schedule')).toBeTruthy();

    // Trigger button
    const trigger = container.querySelector('.df-sidebar-select-trigger');
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger!);

    // Dropdown is rendered inline inside the dialog (not on document.body)
    const dropdown = container.querySelector(
      '.df-sidebar-dropdown'
    ) as HTMLElement;
    expect(dropdown).toBeTruthy();

    // Group labels are rendered
    const groupLabels = dropdown.querySelectorAll(
      '.df-sidebar-dropdown-group-label'
    );
    expect(groupLabels.length).toBe(2);
    expect(groupLabels[0].textContent).toBe('Google');
    expect(groupLabels[1].textContent).toBe('iCloud');

    // Calendar options are rendered inside dropdown
    expect(within(dropdown).getByText('Work')).toBeTruthy();
    expect(within(dropdown).getByText('Personal')).toBeTruthy();
    expect(within(dropdown).getByText('Home')).toBeTruthy();
    expect(within(dropdown).getByText('Misc')).toBeTruthy();
    expect(within(dropdown).getByText(/New Calendar/)).toBeTruthy();
  });
});
