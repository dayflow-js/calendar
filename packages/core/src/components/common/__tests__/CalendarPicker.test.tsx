import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';

import {
  CalendarPicker,
  CalendarOption,
} from '@/components/common/CalendarPicker';

describe('CalendarPicker Grouping', () => {
  it('renders group headers when options specify groups', () => {
    const options: CalendarOption[] = [
      { label: 'Work Cal', value: 'work', group: 'Google' },
      { label: 'Personal Cal', value: 'personal', group: 'Google' },
      { label: 'Home Cal', value: 'home', group: 'iCloud' },
      { label: 'Ungrouped Cal', value: 'other' },
    ];
    const onChange = vi.fn();

    const { container } = render(
      <CalendarPicker options={options} value='work' onChange={onChange} />
    );

    // Open dropdown
    const trigger = container.querySelector('button');
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger!);

    // Check that group headers exist
    expect(screen.getByText('Google')).toBeTruthy();
    expect(screen.getByText('iCloud')).toBeTruthy();
    expect(screen.getByText('Work Cal')).toBeTruthy();
    expect(screen.getByText('Home Cal')).toBeTruthy();
    expect(screen.getByText('Ungrouped Cal')).toBeTruthy();

    const groupLabels = document.querySelectorAll(
      '.df-calendar-picker-group-label'
    );
    expect(groupLabels.length).toBe(2);
  });

  it('renders flat list without group headers when no options specify groups', () => {
    const options: CalendarOption[] = [
      { label: 'Work Cal', value: 'work' },
      { label: 'Personal Cal', value: 'personal' },
    ];
    const onChange = vi.fn();

    const { container } = render(
      <CalendarPicker options={options} value='work' onChange={onChange} />
    );

    const trigger = container.querySelector('button');
    fireEvent.click(trigger!);

    expect(screen.getByText('Work Cal')).toBeTruthy();
    expect(screen.getByText('Personal Cal')).toBeTruthy();
    const groupLabels = document.querySelectorAll(
      '.df-calendar-picker-group-label'
    );
    expect(groupLabels.length).toBe(0);
  });
});
