import { act, fireEvent, waitFor } from '@testing-library/preact';
import { Temporal } from 'temporal-polyfill';

import { CalendarApp } from '@/core/CalendarApp';
import { createAgendaView } from '@/factories/createAgendaView';
import { CalendarRenderer } from '@/renderer/CalendarRenderer';
import type { EventDetailTrigger } from '@/types';

const cleanups: (() => void)[] = [];
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

const detailPanel = () =>
  document.querySelector<HTMLElement>(
    '[data-event-detail-panel]:not([data-event-detail-panel-handoff])'
  );

function mount(
  eventDetailTrigger?: EventDetailTrigger,
  callbacks: ConstructorParameters<typeof CalendarApp>[0]['callbacks'] = {}
) {
  const app = new CalendarApp({
    views: [createAgendaView()],
    defaultView: 'agenda',
    initialDate: new Date(2026, 4, 11),
    useCalendarHeader: false,
    useEventDetailPanel: true,
    eventDetailTrigger,
    callbacks,
    events: [
      {
        id: 'trip',
        title: 'Trip',
        start: Temporal.PlainDate.from('2026-05-12'),
        end: Temporal.PlainDate.from('2026-05-13'),
        allDay: true,
      },
    ],
  });
  const host = document.createElement('div');
  document.body.append(host);
  const renderer = new CalendarRenderer(app);
  act(() => renderer.mount(host));
  cleanups.push(() => {
    act(() => renderer.unmount());
    app.destroy();
    host.remove();
  });
  const rows = () =>
    [...host.querySelectorAll<HTMLElement>('[data-event-id="trip"]')].filter(
      node => node.classList.contains('df-agenda-event')
    );
  return { host, rows, panel: detailPanel };
}

describe('AgendaView event clicks follow eventDetailTrigger', () => {
  it('opens the panel on a single click in click mode', async () => {
    const onEventClick = vi.fn();
    const { rows, panel } = mount('click', { onEventClick });
    fireEvent.click(rows()[0]);
    expect(onEventClick).toHaveBeenCalledOnce();
    await waitFor(() => expect(panel()).not.toBeNull());
  });

  it('selects on click and opens on double click by default', async () => {
    const onEventDoubleClick = vi.fn();
    const { rows, panel } = mount(undefined, { onEventDoubleClick });
    fireEvent.click(rows()[0]);
    expect(rows()[0]).toHaveAttribute('data-selected', 'true');
    expect(panel()).toBeNull();
    fireEvent.dblClick(rows()[0]);
    expect(onEventDoubleClick).toHaveBeenCalledOnce();
    await waitFor(() => expect(panel()).not.toBeNull());
  });

  it('keeps the panel closed when onEventDoubleClick returns false', async () => {
    const { rows, panel } = mount('dbClick', {
      onEventDoubleClick: () => false,
    });
    fireEvent.dblClick(rows()[0]);
    await new Promise(resolve => {
      setTimeout(resolve, 20);
    });
    expect(panel()).toBeNull();
  });

  it('anchors to the clicked day of a multi-day event and closes outside', async () => {
    const { host, rows, panel } = mount('click');
    expect(rows()).toHaveLength(2);
    expect(rows()[0].dataset.detailPanelKey).not.toBe(
      rows()[1].dataset.detailPanelKey
    );
    fireEvent.click(rows()[1]);
    await waitFor(() => expect(panel()).not.toBeNull());
    fireEvent.mouseDown(host.querySelector('.df-agenda-scroll')!);
    await waitFor(() => expect(panel()).toBeNull());
  });
});
