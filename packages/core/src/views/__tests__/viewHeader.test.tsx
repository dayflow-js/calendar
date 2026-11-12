import { act } from '@testing-library/preact';

import { CalendarApp } from '@/core/CalendarApp';
import { createAgendaView } from '@/factories/createAgendaView';
import { createDayView } from '@/factories/createDayView';
import { createMonthView } from '@/factories/createMonthView';
import { createWeekView } from '@/factories/createWeekView';
import { createYearView } from '@/factories/createYearView';
import { CalendarRenderer } from '@/renderer/CalendarRenderer';
import { CalendarAppConfig, CalendarView } from '@/types';
import {
  createConfigSyncSnapshot,
  syncCalendarAppConfig,
} from '@/utils/calendarApp/configSync';

const headers =
  '.df-view-header-container, .df-right-panel-calendar-header, .df-mini-calendar-header-nav';

describe('per-view headers', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['month', () => createMonthView()],
    ['week', () => createWeekView({ scrollToCurrentTime: false })],
    ['day', () => createDayView({ scrollToCurrentTime: false })],
    ['agenda', () => createAgendaView()],
    ['year canvas', () => createYearView({ mode: 'year-canvas' })],
    ['year fixed week', () => createYearView({ mode: 'fixed-week' })],
    ['year grid', () => createYearView({ mode: 'grid' })],
  ] satisfies [string, () => CalendarView][])(
    'preserves default markup and supports suppressing/updating %s headers',
    (_name, createView) => {
      const view = createView();
      const app = new CalendarApp({
        views: [view],
        defaultView: view.type,
        initialDate: new Date(2026, 4, 12),
        useCalendarHeader: false,
      });
      const host = document.createElement('div');
      document.body.append(host);
      const renderer = new CalendarRenderer(app);
      try {
        act(() => renderer.mount(host));
        const markup = () =>
          Array.from(host.querySelectorAll(headers), el => el.outerHTML);
        const defaultHeaders = markup();
        expect(defaultHeaders.length).toBe(view.type === 'day' ? 3 : 1);

        // Explicit true preserves the default markup.
        act(() => app.updateConfig({ useViewHeader: true }));
        expect(markup()).toEqual(defaultHeaders);
        act(() => app.updateConfig({ useViewHeader: false }));
        expect(markup()).toEqual([]);
        expect(host.textContent?.trim().length).toBeGreaterThan(0);
        act(() => app.updateConfig({ readOnly: true }));
        expect(markup()).toEqual([]);
        act(() => app.updateConfig({ useViewHeader: true }));
        expect(markup()).toEqual(defaultHeaders);
      } finally {
        act(() => renderer.unmount());
        host.remove();
      }
    }
  );

  it('initializes suppressed headers and synchronizes wrapper changes including restoring the default', () => {
    const config: CalendarAppConfig = {
      views: [createMonthView()],
      defaultView: 'month',
      initialDate: new Date(2026, 4, 12),
      useViewHeader: false,
    };
    const app = new CalendarApp(config);
    const host = document.createElement('div');
    const renderer = new CalendarRenderer(app);
    try {
      act(() => renderer.mount(host));
      expect(host.querySelectorAll(headers)).toHaveLength(0);
      let snapshot = createConfigSyncSnapshot(config);
      const { useViewHeader: _, ...defaultConfig } = config;
      act(() => {
        snapshot = syncCalendarAppConfig(app, snapshot, defaultConfig);
      });
      expect(host.querySelectorAll(headers)).toHaveLength(1);
      act(() => {
        snapshot = syncCalendarAppConfig(app, snapshot, config);
      });
      expect(host.querySelectorAll(headers)).toHaveLength(0);
    } finally {
      act(() => renderer.unmount());
    }
  });
});
