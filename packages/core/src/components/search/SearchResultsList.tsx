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
    className='h-12 w-12 text-gray-300 dark:text-gray-600'
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

  // Group events by date (sorted)
  const groupedEvents = useMemo(
    () => groupSearchResults(results, today),
    [results, today]
  );

  // Helper to get time string
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
      <div className='flex h-40 flex-col items-center justify-center text-gray-500'>
        <Loader2 className='mb-2 h-8 w-8 animate-spin' />
        <span>Loading...</span>
      </div>
    );
  }

  if (results.length === 0) {
    return keyword ? (
      <div className='flex h-40 flex-col items-center justify-center text-gray-500'>
        <SearchIconPlaceholder />
        <span className='mt-2 text-sm'>{getEmptyText()}</span>
      </div>
    ) : null;
  }

  return (
    <div className='space-y-6'>
      {groupedEvents.map(group => {
        const { title, colorClass } = getSearchHeaderInfo(
          group.date,
          today,
          locale,
          t
        );

        return (
          <div key={group.date.getTime()}>
            <h3
              className={`sticky top-0 z-10 mb-4 bg-white px-2 py-1 text-sm font-medium dark:bg-gray-900 ${colorClass} border-b border-gray-200 dark:border-gray-700`}
            >
              {title}
            </h3>
            <div className='flex flex-col'>
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
                      className='group mx-2 mb-1 cursor-pointer rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800'
                      onClick={() => onResultClick?.(event)}
                    >
                      <div className='flex items-stretch gap-3'>
                        <div
                          className='w-1 shrink-0 rounded-full'
                          style={{ backgroundColor: event.color || '#3b82f6' }}
                        />
                        <div className='flex min-w-0 flex-1 items-start justify-between'>
                          <div className='truncate pr-2 text-sm font-medium text-black dark:text-white'>
                            {event.title}
                          </div>
                          <div className='flex shrink-0 flex-col items-end text-xs leading-tight'>
                            <div className='text-black dark:text-white'>
                              {startTimeStr}
                            </div>
                            {endTimeStr && (
                              <div className='text-gray-500 dark:text-gray-400'>
                                {endTimeStr}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className='mx-2 border-b border-gray-200 dark:border-gray-700' />
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
