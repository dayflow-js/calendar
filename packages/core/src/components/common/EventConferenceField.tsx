import type { JSX } from 'preact';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';

import { useLocale } from '@/locale';
import type { EventConference, KnownMeetingProviderId } from '@/types';
import {
  createEventConference,
  detectMeetingProvider,
  extractMeetingId,
  normalizeMeetingUrl,
} from '@/utils/meetingUtils';

interface EventConferenceFieldProps {
  value?: EventConference;
  editable: boolean;
  disabled?: boolean;
  onChange: (value?: EventConference) => void;
}

interface ProviderIconProps {
  provider: KnownMeetingProviderId | 'custom';
}

const ProviderIcon = ({ provider }: ProviderIconProps) => {
  const commonProps: JSX.SVGAttributes<SVGSVGElement> = {
    viewBox: '0 0 24 24',
    width: 24,
    height: 24,
    'aria-hidden': true,
    className: 'df-event-conference-provider-icon',
  };

  switch (provider) {
    case 'google-meet':
      return (
        <svg {...commonProps}>
          <path
            fill='#00832d'
            d='M3 6.5A2.5 2.5 0 0 1 5.5 4H14v16H5.5A2.5 2.5 0 0 1 3 17.5Z'
          />
          <path fill='#00ac47' d='M14 8.4 18.4 5H21v14h-2.6L14 15.6Z' />
          <path fill='#ffba00' d='M3 6.5 7 10.2V4H5.5A2.5 2.5 0 0 0 3 6.5Z' />
          <path
            fill='#2684fc'
            d='M3 17.5A2.5 2.5 0 0 0 5.5 20H7v-6.2L3 17.5Z'
          />
        </svg>
      );
    case 'zoom':
      return (
        <svg {...commonProps}>
          <rect width='22' height='22' x='1' y='1' rx='5' fill='#2d8cff' />
          <path
            fill='white'
            d='M5.2 8.1c0-.7.6-1.3 1.3-1.3h6.4c.7 0 1.3.6 1.3 1.3v7.8c0 .7-.6 1.3-1.3 1.3H6.5c-.7 0-1.3-.6-1.3-1.3Zm9.9 2.3 3-2.2c.4-.3.9 0 .9.5v6.6c0 .5-.5.8-.9.5l-3-2.2Z'
          />
        </svg>
      );
    case 'microsoft-teams':
      return (
        <svg {...commonProps}>
          <rect width='14' height='15' x='7' y='6' rx='3' fill='#5b5fc7' />
          <circle cx='16.5' cy='4.5' r='2.5' fill='#7b83eb' />
          <rect width='12' height='12' x='2' y='8' rx='2' fill='#464eb8' />
          <path fill='white' d='M5 10h7v2H9.6v6H7.4v-6H5Z' />
        </svg>
      );
    case 'webex':
      return (
        <svg {...commonProps} fill='none'>
          <path
            d='M4.2 8.7A8.5 8.5 0 0 1 19 6.5'
            stroke='#00bceb'
            stroke-width='4'
            stroke-linecap='round'
          />
          <path
            d='M19.8 15.3A8.5 8.5 0 0 1 5 17.5'
            stroke='#6ebe44'
            stroke-width='4'
            stroke-linecap='round'
          />
          <path
            d='M19 6.5a8.5 8.5 0 0 1 .8 8.8M5 17.5a8.5 8.5 0 0 1-.8-8.8'
            stroke='#1d805f'
            stroke-width='4'
            stroke-linecap='round'
          />
        </svg>
      );
    case 'whereby':
      return (
        <svg {...commonProps}>
          <rect width='22' height='22' x='1' y='1' rx='6' fill='#ff5a60' />
          <path
            d='M6 8.5 9.3 16 12 10.2 14.7 16 18 8.5'
            fill='none'
            stroke='white'
            stroke-width='2.2'
            stroke-linecap='round'
            stroke-linejoin='round'
          />
        </svg>
      );
    case 'jitsi':
      return (
        <svg {...commonProps}>
          <path
            fill='#1c73e8'
            d='M12 2 4 5.2v5.9c0 5 3.4 9.2 8 10.9 4.6-1.7 8-5.9 8-10.9V5.2Z'
          />
          <path
            fill='white'
            d='M9.2 7.2h2.2v7.1c0 1.8-1 2.8-2.8 2.8-.7 0-1.3-.1-1.8-.4l.5-1.8c.3.1.6.2.9.2.7 0 1-.4 1-1.2Zm0-2.1h2.2v1.7H9.2Z'
          />
        </svg>
      );
    default:
      return (
        <svg
          {...commonProps}
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
          stroke-linejoin='round'
        >
          <rect width='14' height='12' x='3' y='6' rx='2' />
          <path d='m17 10 4-2v8l-4-2Z' />
        </svg>
      );
  }
};

const getDisplayMeetingId = (
  conference: EventConference
): string | undefined => {
  const provider = detectMeetingProvider(conference.joinUrl);
  return conference.meetingId ?? extractMeetingId(conference.joinUrl, provider);
};

export const EventConferenceField = ({
  value,
  editable,
  disabled = false,
  onChange,
}: EventConferenceFieldProps) => {
  const { t } = useLocale();
  const [isEditing, setIsEditing] = useState(!value);
  const [draftUrl, setDraftUrl] = useState(value?.joinUrl ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const focusInputRef = useRef(false);

  // The edit button disappears when it is clicked, so hand focus to the link
  // field instead of letting it fall back to the page.
  useLayoutEffect(() => {
    if (!isEditing || !focusInputRef.current) return;
    focusInputRef.current = false;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) setDraftUrl(value?.joinUrl ?? '');
  }, [value?.joinUrl, isEditing]);

  const normalizedDraftUrl = useMemo(
    () => normalizeMeetingUrl(draftUrl),
    [draftUrl]
  );
  const isInvalid = draftUrl.trim().length > 0 && !normalizedDraftUrl;
  const showEditor = editable && (!value || isEditing);
  const provider = showEditor
    ? normalizedDraftUrl
      ? detectMeetingProvider(normalizedDraftUrl)
      : null
    : value
      ? detectMeetingProvider(value.joinUrl)
      : null;
  const providerName =
    provider?.id === 'custom' ? t('videoMeeting') : provider?.name;
  const displayMeetingId = value ? getDisplayMeetingId(value) : undefined;
  const safeJoinUrl = value ? normalizeMeetingUrl(value.joinUrl) : null;

  if (!editable && !value) return null;

  const handleInput = (nextValue: string) => {
    setDraftUrl(nextValue);
  };

  const finishEditing = () => {
    if (isInvalid) return;
    if (!draftUrl.trim()) {
      onChange();
      setIsEditing(false);
      return;
    }

    const conference = createEventConference(draftUrl);
    if (conference) {
      onChange(conference);
      setDraftUrl(conference.joinUrl);
      setIsEditing(false);
    }
  };

  const cancelEditing = () => {
    setDraftUrl(value?.joinUrl ?? '');
    setIsEditing(false);
  };

  return (
    <div className='df-event-conference-field'>
      <span className='df-form-label'>{t('videoMeeting')}</span>

      {showEditor ? (
        <div>
          <div
            className='df-event-conference-editor'
            data-invalid={isInvalid ? 'true' : undefined}
          >
            {/* Same slot as the summary's icon so nothing shifts on edit. */}
            <ProviderIcon provider={provider?.id ?? 'custom'} />
            <input
              ref={inputRef}
              type='url'
              inputMode='url'
              value={draftUrl}
              disabled={disabled}
              className='df-form-input df-event-conference-input'
              placeholder={t('meetingUrlPlaceholder')}
              aria-label={t('meetingUrl')}
              aria-invalid={isInvalid}
              onInput={event =>
                handleInput((event.currentTarget as HTMLInputElement).value)
              }
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  finishEditing();
                } else if (event.key === 'Escape' && value) {
                  event.preventDefault();
                  cancelEditing();
                }
              }}
            />
            {(normalizedDraftUrl || value) && (
              <button
                type='button'
                className='df-event-conference-done'
                disabled={disabled || isInvalid}
                onClick={finishEditing}
              >
                {t('done')}
              </button>
            )}
          </div>
          {isInvalid && (
            <div className='df-event-conference-error' role='alert'>
              {t('invalidMeetingUrl')}
            </div>
          )}
        </div>
      ) : value ? (
        <div className='df-event-conference-summary'>
          <ProviderIcon provider={provider?.id ?? 'custom'} />
          <div className='df-event-conference-info'>
            <span className='df-event-conference-name'>{providerName}</span>
            {displayMeetingId && (
              <span className='df-event-conference-id'>{displayMeetingId}</span>
            )}
          </div>
          {editable && (
            <button
              type='button'
              className='df-event-conference-icon-button'
              disabled={disabled}
              aria-label={t('editMeetingUrl')}
              title={t('editMeetingUrl')}
              onClick={() => {
                focusInputRef.current = true;
                setIsEditing(true);
              }}
            >
              <svg viewBox='0 0 24 24' aria-hidden='true'>
                <path d='m14.7 5.3 4 4M4 20l3.8-.8L19 8a1.4 1.4 0 0 0 0-2l-1-1a1.4 1.4 0 0 0-2 0L4.8 16.2Z' />
              </svg>
            </button>
          )}
          {safeJoinUrl && (
            <a
              className='df-fill-primary df-hover-primary-solid df-btn-sm df-event-conference-join'
              href={safeJoinUrl}
              target='_blank'
              rel='noopener noreferrer'
            >
              {t('join')}
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
};
