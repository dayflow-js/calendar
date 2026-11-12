import type { Event, EventConference, KnownMeetingProviderId } from '@/types';

export interface MeetingProviderInfo {
  id: KnownMeetingProviderId | 'custom';
  name: string;
}

interface MeetingProviderDefinition extends MeetingProviderInfo {
  id: KnownMeetingProviderId;
  domains: readonly string[];
}

const PROVIDERS: readonly MeetingProviderDefinition[] = [
  {
    id: 'google-meet',
    name: 'Google Meet',
    domains: ['meet.google.com'],
  },
  {
    id: 'zoom',
    name: 'Zoom',
    domains: ['zoom.us'],
  },
  {
    id: 'microsoft-teams',
    name: 'Microsoft Teams',
    domains: ['teams.microsoft.com', 'teams.live.com', 'teams.microsoft.us'],
  },
  {
    id: 'webex',
    name: 'Webex',
    domains: ['webex.com'],
  },
  {
    id: 'whereby',
    name: 'Whereby',
    domains: ['whereby.com'],
  },
  {
    id: 'jitsi',
    name: 'Jitsi Meet',
    domains: ['meet.jit.si', '8x8.vc'],
  },
];

const CUSTOM_PROVIDER: MeetingProviderInfo = {
  id: 'custom',
  name: 'Video meeting',
};

const isDomainOrSubdomain = (hostname: string, domain: string): boolean =>
  hostname === domain || hostname.endsWith(`.${domain}`);

const parseMeetingUrl = (input: string): URL | null => {
  const value = input.trim();
  if (!value) return null;

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(value)
    ? value
    : `https://${value}`;

  try {
    const url = new URL(candidate);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
};

/** Normalize a pasted meeting URL and reject unsafe/non-web protocols. */
export const normalizeMeetingUrl = (input: string): string | null =>
  parseMeetingUrl(input)?.toString() ?? null;

/** Resolve a known provider using exact hostname/subdomain matching. */
export const detectMeetingProvider = (input: string): MeetingProviderInfo => {
  const url = parseMeetingUrl(input);
  if (!url) return CUSTOM_PROVIDER;

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  return (
    PROVIDERS.find(provider =>
      provider.domains.some(domain => isDomainOrSubdomain(hostname, domain))
    ) ?? CUSTOM_PROVIDER
  );
};

const decodePathPart = (part?: string): string | undefined => {
  if (!part) return undefined;
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
};

/** Extract a short, displayable meeting ID when the provider URL exposes one. */
export const extractMeetingId = (
  input: string,
  provider = detectMeetingProvider(input)
): string | undefined => {
  const url = parseMeetingUrl(input);
  if (!url) return undefined;

  const parts = url.pathname.split('/').filter(Boolean);
  switch (provider.id) {
    case 'google-meet':
      return decodePathPart(parts[0]);
    case 'zoom': {
      const markerIndex = parts.findIndex(part => ['j', 'w'].includes(part));
      return decodePathPart(parts[markerIndex + 1]);
    }
    case 'webex': {
      const markerIndex = parts.findIndex(part =>
        ['meet', 'join'].includes(part)
      );
      return decodePathPart(parts[markerIndex + 1]);
    }
    case 'whereby':
    case 'jitsi':
      return decodePathPart(parts[0]);
    default:
      return undefined;
  }
};

/** Create canonical conference data from user-entered URL text. */
export const createEventConference = (
  input: string
): EventConference | null => {
  const joinUrl = normalizeMeetingUrl(input);
  if (!joinUrl) return null;

  const provider = detectMeetingProvider(joinUrl);
  const meetingId = extractMeetingId(joinUrl, provider);
  return {
    provider: provider.id,
    joinUrl,
    ...(meetingId ? { meetingId } : {}),
  };
};

/** Find a recognized meeting link in event notes while preserving the notes. */
export const extractConferenceFromDescription = (
  description?: string
): EventConference | undefined =>
  description
    ?.match(/https?:\/\/[^\s<>]+/gi)
    ?.map(candidate =>
      createEventConference(
        candidate
          .split(String.fromCodePoint(34))[0]
          .split(String.fromCodePoint(39))[0]
          .replace(/[),.;!?]+$/, '')
      )
    )
    .find(
      candidate =>
        candidate && detectMeetingProvider(candidate.joinUrl).id !== 'custom'
    ) ?? undefined;

/**
 * Read canonical conference data, with compatibility for the older
 * meta.meetingUrl convention documented by DayFlow.
 */
export const getEventConference = (
  event: Pick<Event, 'conference' | 'meta' | 'description'>
): EventConference | undefined => {
  if (event.conference?.joinUrl) return event.conference;

  const legacyUrl = event.meta?.meetingUrl;
  return (
    (typeof legacyUrl === 'string'
      ? (createEventConference(legacyUrl) ?? undefined)
      : undefined) ?? extractConferenceFromDescription(event.description)
  );
};

/** Set canonical conference data and remove a legacy meta.meetingUrl value. */
export const setEventConference = <T extends Event>(
  event: T,
  conference?: EventConference
): T => {
  const meta = { ...event.meta };
  delete meta.meetingUrl;

  return {
    ...event,
    conference,
    meta: Object.keys(meta).length > 0 ? meta : undefined,
  };
};
