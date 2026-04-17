import { createPortal } from 'preact/compat';
import { useRef, useEffect } from 'preact/hooks';

import { ArrowLeft, X } from '@/components/common/Icons';
import { useLocale } from '@/locale';
import { mobileFullscreen } from '@/styles/classNames';
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
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
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
      <div className='df-search-dialog__header'>
        <button
          type='button'
          onClick={onClose}
          className='df-search-dialog__back-btn'
        >
          <ArrowLeft className='h-6 w-6' />
        </button>
        <div className='df-search-dialog__input-wrap'>
          <input
            ref={inputRef}
            type='text'
            placeholder={t('search') || 'Search'}
            value={keyword}
            onChange={e => {
              const val = (e.target as HTMLInputElement).value;
              if (val !== keyword) onSearchChange(val);
            }}
            className='df-search-dialog__input'
          />
          {keyword && (
            <button
              type='button'
              onClick={() => {
                if (keyword !== '') onSearchChange('');
              }}
              className='df-search-dialog__input-clear'
            >
              <X className='h-4 w-4' />
            </button>
          )}
        </div>
      </div>

      {/* Results List */}
      <div className='df-search-dialog__results'>
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
