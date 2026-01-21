import React, { useRef, useEffect } from 'react';
import SearchResultsList from './SearchResultsList';
import { CalendarSearchEvent } from '../../types/search';
import { ArrowLeft, X } from 'lucide-react';
import { useLocale } from '../../locale/useLocale';

interface MobileSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  keyword: string;
  onSearchChange: (value: string) => void;
  results: CalendarSearchEvent[];
  loading: boolean;
  onResultClick?: (event: CalendarSearchEvent) => void;
  emptyText?: string | Record<string, string>;
}

const MobileSearchDialog: React.FC<MobileSearchDialogProps> = ({
  isOpen,
  onClose,
  keyword,
  onSearchChange,
  results,
  loading,
  onResultClick,
  emptyText,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLocale();

  useEffect(() => {
    if (isOpen) {
      // Focus input when dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
      {/* Header with Back button and Search Input */}
      <div className="flex items-center p-2 border-b border-gray-200 dark:border-gray-700 gap-2">
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 relative">
           <input
            ref={inputRef}
            type="text"
            placeholder={t('search') || 'Search'}
            value={keyword}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-3 pr-10 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:outline-none"
          />
          {keyword && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-2">
        <SearchResultsList
          loading={loading}
          results={results}
          keyword={keyword}
          onResultClick={(e) => {
            onResultClick?.(e);
          }}
          emptyText={emptyText}
        />
      </div>
    </div>
  );
};

export default MobileSearchDialog;
