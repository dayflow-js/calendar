import { Temporal } from 'temporal-polyfill';

import type { Event } from '@/types';
import {
  createEventConference,
  detectMeetingProvider,
  getEventConference,
  normalizeMeetingUrl,
  setEventConference,
} from '@/utils/meetingUtils';

describe('meetingUtils', () => {
  it.each([
    ['https://meet.google.com/abc-defg-hij', 'google-meet'],
    ['https://us02web.zoom.us/j/123456789', 'zoom'],
    ['https://teams.microsoft.com/l/meetup-join/abc', 'microsoft-teams'],
    ['https://acme.webex.com/meet/ada', 'webex'],
    ['https://whereby.com/design-review', 'whereby'],
    ['https://meet.jit.si/dayflow-demo', 'jitsi'],
  ])('detects %s as %s', (url, expectedProvider) => {
    expect(detectMeetingProvider(url).id).toBe(expectedProvider);
  });

  it('does not mistake lookalike domains for known providers', () => {
    expect(detectMeetingProvider('https://zoom.us.example.com/j/123').id).toBe(
      'custom'
    );
    expect(detectMeetingProvider('https://notgooglemeet.com/room').id).toBe(
      'custom'
    );
  });

  it('adds https to a pasted hostname and rejects unsafe protocols', () => {
    expect(normalizeMeetingUrl('meet.google.com/abc-defg-hij')).toBe(
      'https://meet.google.com/abc-defg-hij'
    );
    expect(normalizeMeetingUrl('javascript://alert(1)')).toBeNull();
    expect(normalizeMeetingUrl('mailto:user@example.com')).toBeNull();
    expect(normalizeMeetingUrl('https://user:secret@example.com')).toBeNull();
    expect(normalizeMeetingUrl('not a url')).toBeNull();
  });

  it('creates canonical conference data and extracts a display-safe ID', () => {
    expect(
      createEventConference('https://us02web.zoom.us/j/123456789?pwd=secret')
    ).toEqual({
      provider: 'zoom',
      joinUrl: 'https://us02web.zoom.us/j/123456789?pwd=secret',
      meetingId: '123456789',
    });
  });

  it('reads and migrates the legacy meta.meetingUrl convention', () => {
    const event: Event = {
      id: 'legacy',
      title: 'Legacy meeting',
      start: Temporal.PlainDateTime.from('2026-09-14T10:00'),
      end: Temporal.PlainDateTime.from('2026-09-14T11:00'),
      meta: {
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
        source: 'import',
      },
    };

    const conference = getEventConference(event);
    expect(conference).toMatchObject({
      provider: 'google-meet',
      meetingId: 'abc-defg-hij',
    });

    expect(setEventConference(event, conference)).toMatchObject({
      conference,
      meta: { source: 'import' },
    });
  });

  it('shows a meeting link from notes on an existing event', () => {
    expect(
      getEventConference({
        description:
          'Microsoft Teams meeting\nJoin:\nhttps://teams.microsoft.com/meet/436605223744481?p=abc\nAgenda',
      })
    ).toMatchObject({
      provider: 'microsoft-teams',
      joinUrl: 'https://teams.microsoft.com/meet/436605223744481?p=abc',
    });
  });
});
