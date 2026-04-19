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
  <div className='df-search-drawer' data-open={isOpen ? 'true' : 'false'}>
    <div className='df-search-drawer-content'>
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
