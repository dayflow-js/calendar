
export interface CalendarSearchEvent {
  id: string;
  title: string;
  start: Date | string | any; // Allow flexibility for Temporal or Date
  end: Date | string | any;
  description?: string;
  color?: string; // For calendar color
  [key: string]: any;
}

export interface CalendarSearchProps {
  /**
   * Debounce delay in ms
   * @default 300
   */
  debounceDelay?: number;

  /**
   * Async search method
   */
  onSearch?: (keyword: string) => Promise<CalendarSearchEvent[]>;

  /**
   * Custom search logic (takes over completely)
   */
  customSearch?: (params: {
    keyword: string;
    events: CalendarSearchEvent[];
  }) => CalendarSearchEvent[];

  /**
   * Search state callback
   */
  onSearchStateChange?: (state: {
    keyword: string;
    loading: boolean;
    results: CalendarSearchEvent[];
  }) => void;

  /**
   * Empty result text
   */
  emptyText?: string | Record<string, string>;
}
