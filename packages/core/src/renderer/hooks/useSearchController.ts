import { useState, useEffect, useCallback } from 'preact/hooks';
import { ICalendarApp } from '../../types';
import { CalendarSearchProps, CalendarSearchEvent } from '../../types/search';
import { temporalToDate } from '../../utils/temporal';

export interface SearchController {
  searchKeyword: string;
  setSearchKeyword: (kw: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isMobileSearchOpen: boolean;
  setIsMobileSearchOpen: (open: boolean) => void;
  searchLoading: boolean;
  searchResults: CalendarSearchEvent[];
  handleSearchResultClick: (event: CalendarSearchEvent) => void;
  handleSearchClick: () => void;
  handleSearchClose: () => void;
  handleMobileSearchClose: () => void;
}

/**
 * Manages all search state: keyword, debounce, loading, results, drawer
 * visibility for desktop and mobile, and highlight sync.
 */
export function useSearchController(
  app: ICalendarApp,
  searchConfig: CalendarSearchProps | undefined
): SearchController {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<CalendarSearchEvent[]>([]);

  // Sync highlighted event → selected event whenever the app highlights one
  // (e.g. after navigating to a search result).
  useEffect(() => {
    if (app.state.highlightedEventId) {
      app.selectEvent(app.state.highlightedEventId);
    }
  }, [app.state.highlightedEventId, app]);

  // Clear highlight when search drawer closes.
  useEffect(() => {
    if (!isSearchOpen && app.state.highlightedEventId !== null) {
      app.highlightEvent(null);
    }
  }, [isSearchOpen, app]);

  // Debounced search execution.
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setIsSearchOpen(false);
      setSearchResults([]);
      if (app.state.highlightedEventId !== null) {
        app.highlightEvent(null);
      }
      return;
    }

    const debounceDelay = searchConfig?.debounceDelay ?? 300;

    const performSearch = async () => {
      setSearchLoading(true);
      setIsSearchOpen(true);

      try {
        let results: CalendarSearchEvent[] = [];

        if (searchConfig?.customSearch) {
          const currentEvents = app.getEvents().map(e => ({
            ...e,
            color:
              app.getCalendarRegistry().get(e.calendarId || '')?.colors
                .lineColor || app.getCalendarRegistry().resolveColors().lineColor,
          }));
          results = searchConfig.customSearch({
            keyword: searchKeyword,
            events: currentEvents,
          });
        } else if (searchConfig?.onSearch) {
          results = await searchConfig.onSearch(searchKeyword);
        } else {
          const keywordLower = searchKeyword.toLowerCase();
          results = app
            .getEvents()
            .filter(
              e =>
                e.title.toLowerCase().includes(keywordLower) ||
                (e.description &&
                  e.description.toLowerCase().includes(keywordLower))
            )
            .map(e => ({
              ...e,
              color:
                app.getCalendarRegistry().get(e.calendarId || '')?.colors
                  .lineColor ||
                app.getCalendarRegistry().resolveColors().lineColor,
            }));
        }

        setSearchResults(results);
        searchConfig?.onSearchStateChange?.({
          keyword: searchKeyword,
          loading: false,
          results,
        });
      } catch (error) {
        console.error('Search failed', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const timer = setTimeout(performSearch, debounceDelay);
    return () => clearTimeout(timer);
  }, [searchKeyword, searchConfig, app]);

  const handleSearchResultClick = useCallback(
    (event: CalendarSearchEvent) => {
      let date: Date;
      if (event.start instanceof Date) {
        date = event.start;
      } else if (typeof event.start === 'string') {
        date = new Date(event.start);
      } else {
        date = temporalToDate(event.start as any);
      }
      app.setCurrentDate(date);
      app.highlightEvent(event.id);

      if (isMobileSearchOpen) {
        setIsMobileSearchOpen(false);
      }
    },
    [app, isMobileSearchOpen]
  );

  // Opens the mobile search dialog and resets the keyword.
  const handleSearchClick = useCallback(() => {
    setSearchKeyword('');
    setIsMobileSearchOpen(true);
  }, []);

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    setSearchKeyword('');
    app.highlightEvent(null);
  }, [app]);

  const handleMobileSearchClose = useCallback(() => {
    setIsMobileSearchOpen(false);
    setSearchKeyword('');
    app.highlightEvent(null);
  }, [app]);

  return {
    searchKeyword,
    setSearchKeyword,
    isSearchOpen,
    setIsSearchOpen,
    isMobileSearchOpen,
    setIsMobileSearchOpen,
    searchLoading,
    searchResults,
    handleSearchResultClick,
    handleSearchClick,
    handleSearchClose,
    handleMobileSearchClose,
  };
}
