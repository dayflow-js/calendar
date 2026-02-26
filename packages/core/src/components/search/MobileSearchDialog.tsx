import { createPortal } from 'preact/compat';
import { useRef, useEffect } from 'preact/hooks';

import { ArrowLeft, X } from '@/components/common/Icons';
import { useLocale } from '@/locale';
import { mobileFullscreen, borderBottom } from '@/styles/classNames';
import { CalendarSearchEvent } from '@/types/search';

import SearchResultsList from './SearchResultsList';

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

const MobileSearchDialog = ({
  isOpen,
  onClose,
  keyword,
  onSearchChange,
  results,
  loading,
  onResultClick,
  emptyText,
}: MobileSearchDialogProps) => {
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

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div className={mobileFullscreen}>
      {/* Header with Back button and Search Input */}
      <div className={`flex items-center p-2 ${borderBottom} gap-2`}>
        <button
          type='button'
          onClick={onClose}
          className='p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        >
          <ArrowLeft className='h-6 w-6' />
        </button>
        <div className='relative flex-1'>
          <input
            ref={inputRef}
            type='text'
            placeholder={t('search') || 'Search'}
            value={keyword}
            onChange={e => {
              const val = (e.target as HTMLInputElement).value;
              if (val !== keyword) onSearchChange(val);
            }}
            className='w-full rounded-full border-none bg-gray-100 py-2 pr-10 pl-3 text-gray-900 focus:ring-2 focus:ring-primary focus:outline-none dark:bg-gray-800 dark:text-gray-100'
          />
          {keyword && (
            <button
              type='button'
              onClick={() => {
                if (keyword !== '') onSearchChange('');
              }}
              className='absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400'
            >
              <X className='h-4 w-4' />
            </button>
          )}
        </div>
      </div>

      {/* Results List */}
      <div className='flex-1 overflow-y-auto p-2 select-none'>
        <SearchResultsList
          loading={loading}
          results={results}
          keyword={keyword}
          onResultClick={e => {
            onResultClick?.(e);
          }}
          emptyText={emptyText}
        />
      </div>
    </div>,
    document.body
  );
};

export default MobileSearchDialog;
