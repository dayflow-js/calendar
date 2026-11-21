// preact/debug reports duplicate sibling keys through console.error.
import 'preact/debug';
import { render } from '@testing-library/preact';
import { Temporal } from 'temporal-polyfill';

import { EventDetailPanelHost } from '@/components/calendarEvent/components/EventDetailPanelHost';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/locale';

describe('DefaultEventDetailPanel keys', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the conference and notes fields without duplicate keys', () => {
    const errors = vi.spyOn(console, 'error');
    const calendarDiv = document.createElement('div');
    document.body.append(calendarDiv);

    render(
      <ThemeProvider initialTheme='light'>
        <LocaleProvider>
          <EventDetailPanelHost
            detailPanelEventId='evt-1'
            events={[
              {
                id: 'evt-1',
                title: 'Planning',
                start: Temporal.PlainDateTime.from('2026-09-20T09:00'),
                end: Temporal.PlainDateTime.from('2026-09-20T10:00'),
              },
            ]}
            calendarRef={{ current: calendarDiv }}
            onEventUpdate={vi.fn()}
            onEventDelete={vi.fn()}
          />
        </LocaleProvider>
      </ThemeProvider>
    );

    expect(document.querySelector('#event-note-evt-1')).toBeTruthy();
    expect(
      errors.mock.calls.filter(call => String(call[0]).includes('same key'))
    ).toEqual([]);
  });
});
