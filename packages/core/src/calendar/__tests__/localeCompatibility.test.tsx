import { render, renderHook } from '@testing-library/preact';

import { CalendarApp } from '@/core/CalendarApp';
import { createMonthView } from '@/factories/createMonthView';
import { LocaleProvider, useLocale } from '@/locale';
import { CalendarRoot } from '@/renderer/CalendarRoot';

import { calendarLocale } from '../calendarSystem';

const locales = [
  'en-US',
  'zh-CN',
  'th-TH',
  'ar-SA',
  'en-US-u-ca-buddhist-nu-arab',
];

const LocaleProbe = () => (
  <span data-testid='locale'>{useLocale().locale}</span>
);

describe('calendar locale compatibility', () => {
  beforeEach(() => {
    // CalendarRoot observes viewport changes; jsdom does not provide matchMedia.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each(locales)('preserves the exact Gregorian locale %s', locale => {
    expect(calendarLocale(locale, 'gregorian')).toBe(locale);
    expect(
      new Intl.DateTimeFormat(
        calendarLocale(locale, 'gregorian')
      ).resolvedOptions().calendar
    ).toBe(new Intl.DateTimeFormat(locale).resolvedOptions().calendar);

    const { result } = renderHook(() => useLocale(), {
      wrapper: ({ children }) => (
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      ),
    });
    expect(result.current.locale).toBe(locale);
  });

  it.each(locales)(
    'preserves a parent provider locale in CalendarRoot: %s',
    locale => {
      const app = new CalendarApp({
        views: [createMonthView()],
        defaultView: 'month',
        locale: 'en-US',
      });
      const { getByTestId, unmount } = render(
        <LocaleProvider locale={locale}>
          <CalendarRoot app={app} titleBarSlot={<LocaleProbe />} />
        </LocaleProvider>
      );
      expect(getByTestId('locale').textContent).toBe(locale);
      unmount();
    }
  );

  it.each(locales)(
    'preserves an app locale without a parent provider: %s',
    locale => {
      const app = new CalendarApp({
        views: [createMonthView()],
        defaultView: 'month',
        locale,
      });
      const { getByTestId, unmount } = render(
        <CalendarRoot app={app} titleBarSlot={<LocaleProbe />} />
      );
      expect(getByTestId('locale').textContent).toBe(locale);
      unmount();
    }
  );

  it('overrides only the calendar for Jalali and restores the original locale', () => {
    const locale = 'en-US-u-ca-buddhist-nu-arab';
    const content = (calendarSystem: 'gregorian' | 'jalali') => (
      <LocaleProvider locale={locale} calendarSystem={calendarSystem}>
        <LocaleProbe />
      </LocaleProvider>
    );
    const { getByTestId, rerender } = render(content('gregorian'));
    expect(getByTestId('locale').textContent).toBe(locale);
    rerender(content('jalali'));
    expect(getByTestId('locale').textContent).toBe(
      'en-US-u-ca-persian-nu-arab'
    );
    rerender(content('gregorian'));
    expect(getByTestId('locale').textContent).toBe(locale);
  });

  it('applies the Jalali override to an inherited CalendarRoot locale', () => {
    const app = new CalendarApp({
      views: [createMonthView()],
      defaultView: 'month',
      calendarSystem: 'jalali',
    });
    const { getByTestId, unmount } = render(
      <LocaleProvider locale='en-US-u-nu-arab'>
        <CalendarRoot app={app} titleBarSlot={<LocaleProbe />} />
      </LocaleProvider>
    );
    expect(getByTestId('locale').textContent).toBe(
      'en-US-u-ca-persian-nu-arab'
    );
    unmount();
  });
});
