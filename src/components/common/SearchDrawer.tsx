import React, { useMemo } from 'react';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { CalendarSearchEvent } from '../../types/search';
import { useLocale } from '../../locale/useLocale';

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  results: CalendarSearchEvent[];
  keyword: string;
  onResultClick?: (event: CalendarSearchEvent) => void;
  emptyText?: string | Record<string, string>;
}

const SearchDrawer: React.FC<SearchDrawerProps> = ({
  isOpen,
  onClose,
  loading,
  results,
  keyword,
  onResultClick,
  emptyText,
}) => {
  const { t, locale } = useLocale();

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, CalendarSearchEvent[]> = {};
    
    results.forEach(event => {
      let dateKey = '';
      let dateObj: Date;

      // Handle different date formats (Date object or Temporal)
      if (event.start instanceof Date) {
        dateObj = event.start;
      } else if (typeof event.start === 'string') {
        dateObj = new Date(event.start);
      } else if (event.start && typeof event.start.toString === 'function') {
         // Temporal object
         try {
            // detailed handling for Temporal might be needed, but .toString() usually gives ISO
            dateObj = new Date(event.start.toString());
         } catch (e) {
            dateObj = new Date(); // Fallback
         }
      } else {
        dateObj = new Date();
      }
      
      // Use a consistent key format (YYYY-MM-DD)
      dateKey = dateObj.toLocaleDateString(locale, { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      
      // Store full date string for display
      const displayDate = dateObj.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });

      if (!groups[displayDate]) {
        groups[displayDate] = [];
      }
      groups[displayDate].push(event);
    });

    return groups;
  }, [results, locale]);

  // Format time range
  const formatTimeRange = (event: CalendarSearchEvent) => {
    // If all day
    if (event.allDay) {
      return t('allDay') || 'All Day';
    }

    // Helper to get time string
    const getTime = (d: any) => {
       if (d instanceof Date) return d;
       if (typeof d === 'string') return new Date(d);
       if (d && typeof d.toString === 'function') return new Date(d.toString());
       return new Date();
    };

    const start = getTime(event.start);
    const end = getTime(event.end);

    const timeOpt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    return `${start.toLocaleTimeString(locale, timeOpt)} – ${end.toLocaleTimeString(locale, timeOpt)}`;
  };

  const getEmptyText = () => {
    if (typeof emptyText === 'string') return emptyText;
    if (emptyText && typeof emptyText === 'object') {
       // simple fallback or check locale
       return emptyText[locale] || emptyText['en'] || 'No results found';
    }
    return t('noResults') || 'No results found';
  };

  return (
    <div 
      className={`relative h-full bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out flex flex-col border-l border-gray-200 dark:border-gray-700 overflow-hidden ${
        isOpen ? 'w-80' : 'w-0 border-l-0'
      }`}
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 min-w-80">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span>Loading...</span>
            </div>
          ) : results.length === 0 ? (
             keyword ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <SearchIconPlaceholder />
                <span className="mt-2 text-sm">{getEmptyText()}</span>
              </div>
             ) : null
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedEvents).map(([dateStr, events]) => (
                <div key={dateStr}>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 sticky top-0 bg-white dark:bg-gray-900 py-1 z-10">
                    {dateStr}
                  </h3>
                  <div className="space-y-2">
                    {events.map(event => (
                      <div 
                        key={event.id}
                        className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors group"
                        onClick={() => onResultClick?.(event)}
                      >
                        <div className="flex items-start gap-2">
                           <div 
                              className="w-1 h-10 rounded-full shrink-0 mt-0.5"
                              style={{ backgroundColor: event.color || '#3b82f6' }}
                           />
                           <div className="flex-1 min-w-0">
                             <div className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">
                               {event.title}
                             </div>
                             <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                               {formatTimeRange(event)}
                             </div>
                             {event.description && (
                               <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                                 {event.description}
                               </div>
                             )}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
};

const SearchIconPlaceholder = () => (
  <svg
    className="w-12 h-12 text-gray-300 dark:text-gray-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

export default SearchDrawer;
