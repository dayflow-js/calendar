import { renderHook, act } from '@testing-library/preact';

import { useSearchController } from '@/renderer/hooks/useSearchController';
import { ICalendarApp } from '@/types';
import { CalendarSearchEvent } from '@/types/search';

describe('useSearchController', () => {
  let mockApp: ICalendarApp;

  beforeEach(() => {
    mockApp = {
      state: {
        highlightedEventId: null,
        locale: 'en-US',
        switcherMode: 'select',
        calendarRegistry: {
          get: jest.fn(),
          resolveColors: jest.fn(() => ({ lineColor: '#000' })),
        },
      },
      selectEvent: jest.fn(),
      highlightEvent: jest.fn(),
      setCurrentDate: jest.fn(),
      getEvents: jest.fn(() => []),
      getCalendarRegistry: jest.fn(() => ({
        get: jest.fn(),
        resolveColors: jest.fn(() => ({ lineColor: '#000' })),
      })),
      subscribeThemeChange: jest.fn(() => () => {
        /* unsubscribe */
      }),
      getTheme: jest.fn(() => 'light'),
    } as unknown as ICalendarApp;
  });

  it('should call onResultClick when provided', () => {
    const onResultClick = jest.fn();
    const searchConfig = { onResultClick };
    const { result } = renderHook(() =>
      useSearchController(mockApp, searchConfig)
    );

    const event = {
      id: '1',
      title: 'Test Event',
      start: new Date(),
    } as unknown as CalendarSearchEvent;
    act(() => {
      result.current.handleSearchResultClick(event, 'desktop');
    });

    expect(onResultClick).toHaveBeenCalledWith(
      expect.objectContaining({
        event,
        app: mockApp,
        source: 'desktop',
      })
    );

    // Check if defaultAction is passed and works
    const callArgs = onResultClick.mock.calls[0][0];
    act(() => {
      callArgs.defaultAction();
    });
    expect(mockApp.setCurrentDate).toHaveBeenCalled();
    expect(mockApp.highlightEvent).toHaveBeenCalledWith('1');
  });

  it('should execute defaultAction when onResultClick is not provided', () => {
    const searchConfig = {};
    const { result } = renderHook(() =>
      useSearchController(mockApp, searchConfig)
    );

    const event = {
      id: '1',
      title: 'Test Event',
      start: new Date(),
    } as unknown as CalendarSearchEvent;
    act(() => {
      result.current.handleSearchResultClick(event, 'desktop');
    });

    expect(mockApp.setCurrentDate).toHaveBeenCalled();
    expect(mockApp.highlightEvent).toHaveBeenCalledWith('1');
  });

  it('should close search when closeSearch is called', () => {
    const onResultClick = jest.fn(({ closeSearch }) => {
      closeSearch();
    });
    const searchConfig = { onResultClick };
    const { result } = renderHook(() =>
      useSearchController(mockApp, searchConfig)
    );

    // Open desktop search first
    act(() => {
      result.current.setIsSearchOpen(true);
    });
    expect(result.current.isSearchOpen).toBe(true);

    const event = {
      id: '1',
      title: 'Test Event',
      start: new Date(),
    } as unknown as CalendarSearchEvent;
    act(() => {
      result.current.handleSearchResultClick(event, 'desktop');
    });

    expect(result.current.isSearchOpen).toBe(false);
    expect(mockApp.highlightEvent).toHaveBeenCalledWith(null);

    // Test mobile close
    act(() => {
      result.current.setIsMobileSearchOpen(true);
    });
    expect(result.current.isMobileSearchOpen).toBe(true);

    act(() => {
      result.current.handleSearchResultClick(event, 'mobile');
    });
    expect(result.current.isMobileSearchOpen).toBe(false);
  });
});
