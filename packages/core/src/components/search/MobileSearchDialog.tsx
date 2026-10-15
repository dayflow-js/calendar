import { createPortal } from 'preact/compat';
import { useRef, useEffect } from 'preact/hooks';

import { ArrowLeft, X } from '@/components/common/Icons';
import { useLocale } from '@/locale';
import { mobileFullscreen } from '@/styles/classNames';
import { ICalendarApp } from '@/types';
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
  app?: ICalendarApp;
  timeFormat?: '12h' | '24h';
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
  app,
  timeFormat,
}: MobileSearchDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLocale();

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    // Return focus to whatever opened the dialog once it closes.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

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
    <div
      className={mobileFullscreen}
      role='dialog'
      aria-modal='true'
      aria-label={t('search')}
    >
      {/* Header with Back button and Search Input */}
      <div className='df-search-dialog-header'>
        <button
          type='button'
          onClick={onClose}
          className='df-search-dialog-back-btn'
          aria-label={t('closeSearch')}
        >
          <ArrowLeft className='df-search-dialog-back-icon' />
        </button>
        <div className='df-search-dialog-input-wrap'>
          <input
            ref={inputRef}
            type='text'
            placeholder={t('search') || 'Search'}
            aria-label={t('search')}
            value={keyword}
            onChange={e => {
              const val = (e.target as HTMLInputElement).value;
              if (val !== keyword) onSearchChange(val);
            }}
            className='df-search-dialog-input'
          />
          {keyword && (
            <button
              type='button'
              onClick={() => {
                if (keyword !== '') onSearchChange('');
              }}
              className='df-search-dialog-input-clear'
              aria-label={t('clearSearch')}
            >
              <X className='df-search-dialog-clear-icon' />
            </button>
          )}
        </div>
      </div>

      {/* Results List */}
      <div className='df-search-dialog-results'>
        <SearchResultsList
          loading={loading}
          results={results}
          keyword={keyword}
          onResultClick={e => {
            onResultClick?.(e);
          }}
          emptyText={emptyText}
          app={app}
          timeFormat={timeFormat}
        />
      </div>
    </div>,
    document.body
  );
};

export default MobileSearchDialog;
