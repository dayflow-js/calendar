import { useLocale } from '@dayflow/core';
import { useState } from 'preact/hooks';

interface SubscribeCalendarDialogProps {
  onSubscribe: (url: string) => Promise<void>;
  onCancel: () => void;
}

export const SubscribeCalendarDialog = ({
  onSubscribe,
  onCancel,
}: SubscribeCalendarDialogProps) => {
  const { t } = useLocale();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setError(null);
    setLoading(true);
    try {
      await onSubscribe(trimmed);
    } catch (err: unknown) {
      if ((err as Error).message === 'DUPLICATE_URL') {
        setError(
          t('calendarAlreadySubscribed') || 'This URL is already subscribed'
        );
      } else {
        setError(t('subscribeError') || 'Failed to subscribe to calendar');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className='df-sidebar-overlay'>
      <div className='df-sidebar-dialog df-sidebar-dialog-wide'>
        <h2 className='df-sidebar-dialog-title'>
          {t('subscribeCalendarTitle')}
        </h2>

        <div>
          <div className='df-sidebar-subscribe-row'>
            <label className='df-sidebar-subscribe-label'>
              {t('calendarUrl')}
            </label>
            <input
              type='url'
              value={url}
              onInput={e => setUrl((e.target as HTMLInputElement).value)}
              onKeyDown={handleKeyDown}
              placeholder={t('calendarUrlPlaceholder')}
              disabled={loading}
              autoFocus
              className='df-sidebar-subscribe-input'
            />
          </div>
          {error && <p className='df-sidebar-error'>{error}</p>}
        </div>

        <div className='df-sidebar-dialog-actions'>
          <button
            type='button'
            onClick={onCancel}
            disabled={loading}
            className='df-sidebar-button df-sidebar-button-secondary'
          >
            {t('cancel')}
          </button>
          <button
            type='button'
            onClick={handleSubmit}
            disabled={loading || !url.trim()}
            className='df-sidebar-button df-sidebar-button-primary'
          >
            {loading ? t('fetchingCalendar') : t('subscribe')}
          </button>
        </div>
      </div>
    </div>
  );
};
