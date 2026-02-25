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
    className='w-12 h-12 text-gray-300 dark:text-gray-600'
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
      <div className='flex flex-col items-center justify-center h-40 text-gray-500'>
        <Loader2 className='w-8 h-8 animate-spin mb-2' />
        <span>Loading...</span>
      </div>
    );
  }

  if (results.length === 0) {
    return keyword ? (
      <div className='flex flex-col items-center justify-center h-40 text-gray-500'>
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
              className={`px-2 text-sm font-medium mb-4 sticky top-0 bg-white dark:bg-gray-900 py-1 z-10 ${colorClass} border-b border-gray-200 dark:border-gray-700`}
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
                      className='p-2 mx-2 mb-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors group'
                      onClick={() => onResultClick?.(event)}
                    >
                      <div className='flex items-stretch gap-3'>
                        <div
                          className='w-1 rounded-full shrink-0'
                          style={{ backgroundColor: event.color || '#3b82f6' }}
                        />
                        <div className='flex-1 min-w-0 flex justify-between items-start'>
                          <div className='font-medium text-black dark:text-white truncate pr-2 text-sm'>
                            {event.title}
                          </div>
                          <div className='text-xs flex flex-col items-end shrink-0 leading-tight'>
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
