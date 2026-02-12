import { h } from 'preact';
import SearchResultsList from './SearchResultsList';
import { CalendarSearchEvent } from '../../types/search';

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
  onClose,
  loading,
  results,
  keyword,
  onResultClick,
  emptyText,
}: SearchDrawerProps) => {
  return (
    <div
      className={`hidden md:flex relative h-full bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out flex-col border-l border-gray-200 dark:border-gray-700 overflow-hidden select-none ${isOpen ? 'w-64' : 'w-0 border-l-0'
        }`}
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto min-w-64">
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
};

export default SearchDrawer;
