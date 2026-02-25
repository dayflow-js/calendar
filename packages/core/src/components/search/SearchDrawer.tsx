import { CalendarSearchEvent } from '@/types/search';

import SearchResultsList from './SearchResultsList';

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  results: CalendarSearchEvent[];
  keyword: string;
  onResultClick?: (event: CalendarSearchEvent) => void;
  emptyText?: string | Record<string, string>;
}

const SearchDrawer = ({
  isOpen,
  loading,
  results,
  keyword,
  onResultClick,
  emptyText,
}: SearchDrawerProps) => (
  <div
    className={`relative hidden h-full flex-col overflow-hidden border-l border-gray-200 bg-white transition-all duration-300 ease-in-out select-none md:flex dark:border-gray-700 dark:bg-gray-900 ${
      isOpen ? 'w-64' : 'w-0 border-l-0'
    }`}
  >
    {/* Content */}
    <div className='min-w-64 flex-1 overflow-y-auto'>
      <SearchResultsList
        loading={loading}
        results={results}
        keyword={keyword}
        onResultClick={onResultClick}
        emptyText={emptyText}
      />
    </div>
  </div>
);

export default SearchDrawer;
