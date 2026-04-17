import { useMemo } from 'preact/hooks';

import { Loader2 } from '@/components/common/Icons';
import { useLocale } from '@/locale/useLocale';
import { CalendarSearchEvent } from '@/types/search';
import {
  groupSearchResults,
  getSearchHeaderInfo,
  getDateObj,
  normalizeDate,
} from '@/utils/searchUtils';

interface SearchResultsListProps {
  loading: boolean;
  results: CalendarSearchEvent[];
  keyword: string;
  onResultClick?: (event: CalendarSearchEvent) => void;
  emptyText?: string | Record<string, string>;
}

const SearchIconPlaceholder = () => (
  <svg
    className='df-search-results__state-icon'
    style={{ width: '3rem', height: '3rem' }}
    fill='none'
    viewBox='0 0 24 24'
    stroke='currentColor'
  >
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1}
      d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
    />
  </svg>
);

const SearchResultsList = ({
  loading,
  results,
  keyword,
  onResultClick,
  emptyText,
}: SearchResultsListProps) => {
  const { t, locale } = useLocale();

  const today = useMemo(() => normalizeDate(new Date()), []);

  const groupedEvents = useMemo(
    () => groupSearchResults(results, today),
    [results, today]
  );

  const getTime = (d: unknown) => getDateObj(d);

  const getEmptyText = () => {
    if (typeof emptyText === 'string') return emptyText;
    if (emptyText && typeof emptyText === 'object') {
      return emptyText[locale] || emptyText['en'] || 'No results found';
    }
    return t('noResults') || 'No results found';
  };

  if (loading) {
    return (
      <div className='df-search-results__state'>
        <Loader2 className='mb-2 h-8 w-8 animate-spin' />
        <span>Loading...</span>
      </div>
    );
  }

  if (results.length === 0) {
    return keyword ? (
      <div className='df-search-results__state'>
        <SearchIconPlaceholder />
        <span style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
          {getEmptyText()}
        </span>
      </div>
    ) : null;
  }

  return (
    <div className='df-search-results'>
      {groupedEvents.map(group => {
        const { title, colorClass } = getSearchHeaderInfo(
          group.date,
          today,
          locale,
          t
        );

        return (
          <div key={group.date.getTime()} className='df-search-results__group'>
            <h3 className={`df-search-results__date-header ${colorClass}`}>
              {title}
            </h3>
            <div className='df-search-results__events'>
              {group.events.map(event => {
                const start = getTime(event.start);
                const end = getTime(event.end);

                const timeOpt: Intl.DateTimeFormatOptions = {
                  hour: '2-digit',
                  minute: '2-digit',
                };
                const startTimeStr = event.allDay
                  ? t('allDay') || 'All Day'
                  : start.toLocaleTimeString(locale, timeOpt);
                const endTimeStr = event.allDay
                  ? ''
                  : end.toLocaleTimeString(locale, timeOpt);

                return (
                  <div key={event.id}>
                    <div
                      className='df-search-results__event'
                      onClick={() => onResultClick?.(event)}
                    >
                      <div className='df-search-results__event-inner'>
                        <div
                          className='df-search-results__color-bar'
                          style={{ backgroundColor: event.color || '#3b82f6' }}
                        />
                        <div className='df-search-results__event-content'>
                          <div className='df-search-results__event-title'>
                            {event.title}
                          </div>
                          <div className='df-search-results__event-time'>
                            <div>{startTimeStr}</div>
                            {endTimeStr && (
                              <div className='df-search-results__end-time'>
                                {endTimeStr}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className='df-search-results__divider' />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SearchResultsList;
