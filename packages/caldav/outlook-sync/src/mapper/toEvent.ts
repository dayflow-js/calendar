import { createEventConference } from '@dayflow/core';
import type { Event } from '@dayflow/core';
import type { OutlookEvent } from '@outlook-sync/types/api';
import { Temporal } from 'temporal-polyfill';

// ─── HTML utilities ──────────────────────────────────────────────────────────

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  laquo: '«',
  raquo: '»',
  copy: '©',
  reg: '®',
  trade: '™',
};

function decodeHtmlEntities(text: string): string {
  return text.replaceAll(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (match, entity: string) => {
      if (entity.startsWith('#x')) {
        return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      }
      if (entity.startsWith('#')) {
        return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      }
      return HTML_ENTITIES[entity.toLowerCase()] ?? match;
    }
  );
}

/** Strip HTML tags from Outlook body.content and decode entities. */
function stripHtml(html: string): string {
  return decodeHtmlEntities(html.replaceAll(/<[^>]+>/g, ' '))
    .replaceAll(/\s+/g, ' ')
    .trim();
}

// ─── Timezone normalization ───────────────────────────────────────────────────

/**
 * Map Windows timezone names to IANA identifiers.
 * Microsoft Graph usually returns IANA names for modern tenants, but some
 * on-premises Exchange / older Graph versions still return Windows names.
 */
const WIN_TO_IANA: Record<string, string> = {
  'Dateline Standard Time': 'Etc/GMT+12',
  'UTC-11': 'Etc/GMT+11',
  'Aleutian Standard Time': 'America/Adak',
  'Hawaiian Standard Time': 'Pacific/Honolulu',
  'Marquesas Standard Time': 'Pacific/Marquesas',
  'Alaskan Standard Time': 'America/Anchorage',
  'UTC-09': 'Etc/GMT+9',
  'Pacific Standard Time (Mexico)': 'America/Santa_Isabel',
  'UTC-08': 'Etc/GMT+8',
  'Pacific Standard Time': 'America/Los_Angeles',
  'US Mountain Standard Time': 'America/Phoenix',
  'Mountain Standard Time (Mexico)': 'America/Chihuahua',
  'Mountain Standard Time': 'America/Denver',
  'Central America Standard Time': 'America/Guatemala',
  'Central Standard Time': 'America/Chicago',
  'Easter Island Standard Time': 'Pacific/Easter',
  'Central Standard Time (Mexico)': 'America/Mexico_City',
  'Canada Central Standard Time': 'America/Regina',
  'SA Pacific Standard Time': 'America/Bogota',
  'Eastern Standard Time (Mexico)': 'America/Cancun',
  'Eastern Standard Time': 'America/New_York',
  'Haiti Standard Time': 'America/Port-au-Prince',
  'Cuba Standard Time': 'America/Havana',
  'US Eastern Standard Time': 'America/Indianapolis',
  'Turks And Caicos Standard Time': 'America/Grand_Turk',
  'Paraguay Standard Time': 'America/Asuncion',
  'Atlantic Standard Time': 'America/Halifax',
  'Venezuela Standard Time': 'America/Caracas',
  'Central Brazilian Standard Time': 'America/Cuiaba',
  'SA Western Standard Time': 'America/La_Paz',
  'Pacific SA Standard Time': 'America/Santiago',
  'Newfoundland Standard Time': 'America/St_Johns',
  'Tocantins Standard Time': 'America/Araguaina',
  'E. South America Standard Time': 'America/Sao_Paulo',
  'SA Eastern Standard Time': 'America/Cayenne',
  'Argentina Standard Time': 'America/Buenos_Aires',
  'Greenland Standard Time': 'America/Godthab',
  'Montevideo Standard Time': 'America/Montevideo',
  'Magallanes Standard Time': 'America/Punta_Arenas',
  'Saint Pierre Standard Time': 'America/Miquelon',
  'Bahia Standard Time': 'America/Bahia',
  'UTC-02': 'Etc/GMT+2',
  'Azores Standard Time': 'Atlantic/Azores',
  'Cape Verde Standard Time': 'Atlantic/Cape_Verde',
  UTC: 'UTC',
  'Morocco Standard Time': 'Africa/Casablanca',
  'GMT Standard Time': 'Europe/London',
  'Greenwich Standard Time': 'Atlantic/Reykjavik',
  'Sao Tome Standard Time': 'Africa/Sao_Tome',
  'W. Europe Standard Time': 'Europe/Berlin',
  'Central Europe Standard Time': 'Europe/Budapest',
  'Romance Standard Time': 'Europe/Paris',
  'Middle East Standard Time': 'Asia/Beirut',
  'Egypt Standard Time': 'Africa/Cairo',
  'E. Europe Standard Time': 'Asia/Nicosia',
  'Syria Standard Time': 'Asia/Damascus',
  'West Bank Standard Time': 'Asia/Hebron',
  'South Africa Standard Time': 'Africa/Johannesburg',
  'FLE Standard Time': 'Europe/Kiev',
  'Israel Standard Time': 'Asia/Jerusalem',
  'Kaliningrad Standard Time': 'Europe/Kaliningrad',
  'Sudan Standard Time': 'Africa/Khartoum',
  'Libya Standard Time': 'Africa/Tripoli',
  'Namibia Standard Time': 'Africa/Windhoek',
  'Jordan Standard Time': 'Asia/Amman',
  'GTB Standard Time': 'Europe/Bucharest',
  'Turkey Standard Time': 'Europe/Istanbul',
  'Arab Standard Time': 'Asia/Riyadh',
  'Belarus Standard Time': 'Europe/Minsk',
  'Russian Standard Time': 'Europe/Moscow',
  'E. Africa Standard Time': 'Africa/Nairobi',
  'Iran Standard Time': 'Asia/Tehran',
  'Arabian Standard Time': 'Asia/Dubai',
  'Astrakhan Standard Time': 'Europe/Astrakhan',
  'Azerbaijan Standard Time': 'Asia/Baku',
  'Russia Time Zone 3': 'Europe/Samara',
  'Mauritius Standard Time': 'Indian/Mauritius',
  'Saratov Standard Time': 'Europe/Saratov',
  'Georgian Standard Time': 'Asia/Tbilisi',
  'Volgograd Standard Time': 'Europe/Volgograd',
  'Caucasus Standard Time': 'Asia/Yerevan',
  'Afghanistan Standard Time': 'Asia/Kabul',
  'West Asia Standard Time': 'Asia/Tashkent',
  'Ekaterinburg Standard Time': 'Asia/Yekaterinburg',
  'Pakistan Standard Time': 'Asia/Karachi',
  'Qyzylorda Standard Time': 'Asia/Qyzylorda',
  'India Standard Time': 'Asia/Calcutta',
  'Sri Lanka Standard Time': 'Asia/Colombo',
  'Nepal Standard Time': 'Asia/Katmandu',
  'Central Asia Standard Time': 'Asia/Almaty',
  'Bangladesh Standard Time': 'Asia/Dhaka',
  'Omsk Standard Time': 'Asia/Omsk',
  'Myanmar Standard Time': 'Asia/Rangoon',
  'SE Asia Standard Time': 'Asia/Bangkok',
  'Altai Standard Time': 'Asia/Barnaul',
  'W. Mongolia Standard Time': 'Asia/Hovd',
  'North Asia Standard Time': 'Asia/Krasnoyarsk',
  'N. Central Asia Standard Time': 'Asia/Novosibirsk',
  'Tomsk Standard Time': 'Asia/Tomsk',
  'China Standard Time': 'Asia/Shanghai',
  'North Asia East Standard Time': 'Asia/Irkutsk',
  'Singapore Standard Time': 'Asia/Singapore',
  'W. Australia Standard Time': 'Australia/Perth',
  'Taipei Standard Time': 'Asia/Taipei',
  'Ulaanbaatar Standard Time': 'Asia/Ulaanbaatar',
  'Aus Central W. Standard Time': 'Australia/Eucla',
  'Transbaikal Standard Time': 'Asia/Chita',
  'Tokyo Standard Time': 'Asia/Tokyo',
  'North Korea Standard Time': 'Asia/Pyongyang',
  'Korea Standard Time': 'Asia/Seoul',
  'Yakutsk Standard Time': 'Asia/Yakutsk',
  'Cen. Australia Standard Time': 'Australia/Adelaide',
  'AUS Central Standard Time': 'Australia/Darwin',
  'E. Australia Standard Time': 'Australia/Brisbane',
  'AUS Eastern Standard Time': 'Australia/Sydney',
  'West Pacific Standard Time': 'Pacific/Port_Moresby',
  'Tasmania Standard Time': 'Australia/Hobart',
  'Vladivostok Standard Time': 'Asia/Vladivostok',
  'Lord Howe Standard Time': 'Australia/Lord_Howe',
  'Bougainville Standard Time': 'Pacific/Bougainville',
  'Russia Time Zone 10': 'Asia/Srednekolymsk',
  'Magadan Standard Time': 'Asia/Magadan',
  'Norfolk Standard Time': 'Pacific/Norfolk',
  'Sakhalin Standard Time': 'Asia/Sakhalin',
  'Central Pacific Standard Time': 'Pacific/Guadalcanal',
  'Russia Time Zone 11': 'Asia/Kamchatka',
  'New Zealand Standard Time': 'Pacific/Auckland',
  'UTC+12': 'Etc/GMT-12',
  'Fiji Standard Time': 'Pacific/Fiji',
  'Chatham Islands Standard Time': 'Pacific/Chatham',
  'UTC+13': 'Etc/GMT-13',
  'Tonga Standard Time': 'Pacific/Tongatapu',
  'Samoa Standard Time': 'Pacific/Apia',
  'Line Islands Standard Time': 'Pacific/Kiritimati',
};

export function normalizeTimezone(tz: string): string {
  // Already IANA (contains "/" or is "UTC")
  if (tz.includes('/') || tz === 'UTC') return tz;
  return WIN_TO_IANA[tz] ?? 'UTC';
}

// ─── DateTime parsing ─────────────────────────────────────────────────────────

/**
 * Parse an Outlook dateTime/timeZone pair into a Temporal value.
 *
 * Outlook dateTime has no UTC offset (e.g. "2025-03-15T10:00:00.0000000").
 * All-day events are parsed as PlainDate; timed events as ZonedDateTime.
 */
export function parseOutlookDateTime(
  dt: { dateTime: string; timeZone: string },
  isAllDay: boolean
): Temporal.PlainDate | Temporal.ZonedDateTime | null {
  if (isAllDay) {
    try {
      return Temporal.PlainDate.from(dt.dateTime.slice(0, 10));
    } catch {
      return null;
    }
  }

  try {
    // Strip sub-second precision that Temporal doesn't accept
    const normalized = dt.dateTime.replace(/\.\d+$/, '');
    const tz = normalizeTimezone(dt.timeZone);
    return Temporal.ZonedDateTime.from(`${normalized}[${tz}]`);
  } catch {
    return null;
  }
}

// ─── Event mapping ────────────────────────────────────────────────────────────

/**
 * Map a Microsoft Graph CalendarEvent to a DayFlow Event.
 * Returns null for cancelled events or events with invalid dates.
 */
export function mapOutlookEventToDayFlow(
  outlookEvent: OutlookEvent,
  calendarId: string
): Event | null {
  if (outlookEvent.isCancelled) return null;

  const isAllDay = outlookEvent.isAllDay;
  const start = parseOutlookDateTime(outlookEvent.start, isAllDay);
  if (!start) return null;

  let end = parseOutlookDateTime(outlookEvent.end, isAllDay);
  if (!end) return null;

  // Outlook all-day end is exclusive midnight of the next day.
  // DayFlow uses inclusive end — subtract one day.
  if (isAllDay && end instanceof Temporal.PlainDate) {
    end = end.subtract({ days: 1 });
    if (Temporal.PlainDate.compare(end, start as Temporal.PlainDate) < 0) {
      end = start as Temporal.PlainDate;
    }
  }

  const isRecurring =
    outlookEvent.type === 'seriesMaster' ||
    outlookEvent.type === 'occurrence' ||
    outlookEvent.type === 'exception';

  const onlineMeetingUrl =
    outlookEvent.onlineMeeting?.joinUrl ?? outlookEvent.onlineMeetingUrl;
  const conference = onlineMeetingUrl
    ? createEventConference(onlineMeetingUrl)
    : null;

  return {
    id: outlookEvent.id,
    title: outlookEvent.subject,
    description: outlookEvent.body?.content
      ? stripHtml(outlookEvent.body.content)
      : undefined,
    start,
    end,
    allDay: isAllDay,
    calendarId,
    ...(conference
      ? {
          conference: {
            ...conference,
            ...(outlookEvent.onlineMeeting?.conferenceId
              ? { meetingId: outlookEvent.onlineMeeting.conferenceId }
              : {}),
          },
        }
      : {}),
    meta: {
      ...(outlookEvent.location?.displayName
        ? { location: outlookEvent.location.displayName }
        : {}),
      outlook: {
        eventId: outlookEvent.id,
        calendarId,
        etag: outlookEvent['@odata.etag'],
        isRecurring,
      },
    },
  };
}
