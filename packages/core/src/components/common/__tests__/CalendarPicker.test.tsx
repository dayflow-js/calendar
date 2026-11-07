import { render, screen, fireEvent } from '@testing-library/preact';
import { afterEach, describe, it, expect, vi } from 'vitest';

import {
  CalendarPicker,
  CalendarOption,
} from '@/components/common/CalendarPicker';

describe('CalendarPicker viewport positioning', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(['desktop', 'mobile'] as const)(
    'keeps the %s dropdown inside the right edge and repositions on resize',
    variant => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(
        240
      );
      const { container } = render(
        <CalendarPicker
          options={[{ label: 'Work Calendar', value: 'work' }]}
          value='work'
          onChange={vi.fn()}
          variant={variant}
        />
      );
      const trigger = container.querySelector('button')!;
      vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
        left: 930,
        right: 990,
        bottom: 120,
        width: 60,
      } as DOMRect);
      fireEvent.click(trigger);
      const dropdown = screen.getByRole('listbox');
      expect(dropdown.style.left).toBe(
        variant === 'mobile' ? '750px' : '752px'
      );
      expect(dropdown.style.top).toBe('124px');

      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800);
      fireEvent(window, new Event('resize'));
      expect(dropdown.style.left).toBe('552px');
    }
  );

  it('keeps a mobile dropdown inside the left edge', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(240);
    const { container } = render(
      <CalendarPicker
        options={[{ label: 'Work Calendar', value: 'work' }]}
        value='work'
        onChange={vi.fn()}
        variant='mobile'
      />
    );
    const trigger = container.querySelector('button')!;
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      left: 8,
      right: 108,
      bottom: 120,
      width: 100,
    } as DOMRect);
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox').style.left).toBe('8px');
  });
});

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
