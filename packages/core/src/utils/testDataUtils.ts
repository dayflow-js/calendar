/**
 * Test Data Generation Utilities
 *
 * This module provides test/demo event data for calendar development and testing.
 * The generated events are relative to the current week for consistent demo experience.
 */

import { Temporal } from 'temporal-polyfill';
import { Event } from '../types';

// ============================================================================
// Test Data Generation
// ============================================================================

/**
 * Generate test events for calendar demo/testing
 * Events are generated relative to the current week (Monday-Sunday)
 * Includes various overlapping events, all-day events, and edge cases
 * @returns Array of test events
 */
export function getTestEvents(): Event[] {
  // Get current time
  const now = new Date();
  // Get current day of week (0=Sunday, 1=Monday, ...6=Saturday)
  const dayOfWeek = now.getDay(); // Sunday is 0, Monday is 1, ...Saturday is 6
  // ISO Monday as week start, calculate this week's Monday date
  const monday = new Date(now);
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days; otherwise normal
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  // Original event template (only keeps day, startHour, endHour, title, calendarId, etc.)
  const template = [
    {
      id: '15',
      title: 'C-早开始',
      day: 3,
      startHour: 8.5,
      endHour: 10,
      calendarId: 'teal',
    },
    {
      id: '16',
      title: 'D-晚开始',
      day: 3,
      startHour: 9,
      endHour: 10.5,
      calendarId: 'red',
    },
    {
      id: '21',
      title: 'A',
      day: 0,
      startHour: 14,
      endHour: 16,
      calendarId: 'blue',
    },
    {
      id: '22',
      title: 'B',
      day: 0,
      startHour: 14.5,
      endHour: 16,
      calendarId: 'green',
    },
    {
      id: '23',
      title: 'C',
      day: 0,
      startHour: 14.5,
      endHour: 16,
      calendarId: 'purple',
    },
    {
      id: '24',
      title: 'D',
      day: 0,
      startHour: 15,
      endHour: 16,
      calendarId: 'yellow',
    },
    {
      id: '25',
      title: 'E',
      day: 0,
      startHour: 15,
      endHour: 16,
      calendarId: 'red',
    },
    {
      id: '26',
      title: 'F',
      day: 0,
      startHour: 15.5,
      endHour: 16,
      calendarId: 'orange',
    },
    {
      id: '27',
      title: 'G',
      day: 0,
      startHour: 15,
      endHour: 16,
      calendarId: 'pink',
    },
    {
      id: '28',
      title: 'H',
      day: 0,
      startHour: 15.5,
      endHour: 16,
      calendarId: 'teal',
    },
    {
      id: '29',
      title: 'L',
      day: 0,
      startHour: 15.5,
      endHour: 16,
      calendarId: 'teal',
    },
    {
      id: '30',
      title: 'I',
      day: 0,
      startHour: 15.5,
      endHour: 16,
      calendarId: 'blue',
    },
    {
      id: '99',
      title: 'X',
      day: 0,
      startHour: 15.5,
      endHour: 16,
      calendarId: 'blue',
    },
    {
      id: '6',
      title: '假日',
      day: 0,
      startHour: 0,
      endHour: 0,
      calendarId: 'blue',
      allDay: true,
    },
    {
      id: '7',
      title: '研讨会',
      day: 2,
      startHour: 0,
      endHour: 0,
      calendarId: 'green',
      allDay: true,
    },
    {
      id: '8',
      title: '团队建设',
      day: 4,
      startHour: 0,
      endHour: 0,
      calendarId: 'purple',
      allDay: true,
    },
    {
      id: '41',
      title: 'A',
      day: 3,
      startHour: 16,
      endHour: 18.25,
      calendarId: 'blue',
    },
    {
      id: '42',
      title: 'B',
      day: 3,
      startHour: 16.5,
      endHour: 18,
      calendarId: 'green',
    },
    {
      id: '43',
      title: 'C',
      day: 3,
      startHour: 16.75,
      endHour: 17.75,
      calendarId: 'purple',
    },
    {
      id: '44',
      title: 'D',
      day: 3,
      startHour: 17,
      endHour: 19,
      calendarId: 'yellow',
    },
    {
      id: '45',
      title: 'E',
      day: 3,
      startHour: 17.75,
      endHour: 18.75,
      calendarId: 'red',
    },
    {
      id: '46',
      title: 'X',
      day: 2,
      startHour: 15,
      endHour: 15.75,
      calendarId: 'orange',
    },
    {
      id: '47',
      title: 'Y',
      day: 2,
      startHour: 15.5,
      endHour: 19.5,
      calendarId: 'pink',
    },
    {
      id: '48',
      title: 'Z',
      day: 2,
      startHour: 15,
      endHour: 15.75,
      calendarId: 'teal',
    },
    {
      id: '59',
      title: 'Q',
      day: 2,
      startHour: 17,
      endHour: 18,
      calendarId: 'teal',
    },
    {
      id: '60',
      title: 'W',
      day: 2,
      startHour: 15.5,
      endHour: 18,
      calendarId: 'teal',
    },
    {
      id: '31',
      title: 'A',
      day: 6,
      startHour: 14,
      endHour: 16,
      calendarId: 'blue',
    },
    {
      id: '32',
      title: 'B',
      day: 6,
      startHour: 14.5,
      endHour: 16,
      calendarId: 'green',
    },
    {
      id: '33',
      title: 'C',
      day: 6,
      startHour: 14.5,
      endHour: 16,
      calendarId: 'purple',
    },
    {
      id: '34',
      title: 'D',
      day: 6,
      startHour: 15,
      endHour: 16,
      calendarId: 'yellow',
    },
    {
      id: '35',
      title: 'E',
      day: 6,
      startHour: 15.5,
      endHour: 16.5,
      calendarId: 'red',
    },
    {
      id: '36',
      title: 'F',
      day: 6,
      startHour: 16.25,
      endHour: 16.75,
      calendarId: 'orange',
    },
    {
      id: '37',
      title: 'G',
      day: 6,
      startHour: 16,
      endHour: 17.25,
      calendarId: 'pink',
    },
    {
      id: '51',
      title: '下周会议1',
      day: 1,
      startHour: 9,
      endHour: 10,
      calendarId: 'blue',
    },
    {
      id: '52',
      title: '下周会议2',
      day: 3,
      startHour: 14,
      endHour: 15,
      calendarId: 'green',
    },
    {
      id: '81',
      title: 'A',
      day: 5,
      startHour: 14,
      endHour: 16,
      calendarId: 'blue',
    },
    {
      id: '82',
      title: 'B',
      day: 5,
      startHour: 14.5,
      endHour: 16,
      calendarId: 'green',
    },
    {
      id: '83',
      title: 'C',
      day: 5,
      startHour: 14.5,
      endHour: 16,
      calendarId: 'purple',
    },
    {
      id: '84',
      title: 'D',
      day: 5,
      startHour: 15,
      endHour: 16,
      calendarId: 'yellow',
    },
    {
      id: '85',
      title: 'E',
      day: 5,
      startHour: 15,
      endHour: 16,
      calendarId: 'red',
    },
    {
      id: '86',
      title: 'F',
      day: 5,
      startHour: 15.75,
      endHour: 17,
      calendarId: 'orange',
    },
    {
      id: '87',
      title: 'G',
      day: 5,
      startHour: 14.75,
      endHour: 17.5,
      calendarId: 'pink',
    },
  ];

  const events: Event[] = template.map(e => {
    // Calculate event date
    const eventDate = new Date(monday);
    eventDate.setDate(monday.getDate() + e.day);

    // If it's an all-day event
    if (e.allDay) {
      return {
        id: e.id,
        title: e.title,
        start: Temporal.PlainDate.from({
          year: eventDate.getFullYear(),
          month: eventDate.getMonth() + 1,
          day: eventDate.getDate(),
        }),
        end: Temporal.PlainDate.from({
          year: eventDate.getFullYear(),
          month: eventDate.getMonth() + 1,
          day: eventDate.getDate(),
        }),
        allDay: true,
        calendarId: e.calendarId,
        day: e.day,
      };
    }

    // Regular event, using Temporal.ZonedDateTime
    const startHour = Math.floor(e.startHour);
    const startMinute = Math.round((e.startHour - startHour) * 60);
    const endHour = Math.floor(e.endHour);
    const endMinute = Math.round((e.endHour - endHour) * 60);

    return {
      id: e.id,
      title: e.title,
      start: Temporal.ZonedDateTime.from({
        year: eventDate.getFullYear(),
        month: eventDate.getMonth() + 1,
        day: eventDate.getDate(),
        hour: startHour,
        minute: startMinute,
        timeZone: Temporal.Now.timeZoneId(),
      }),
      end: Temporal.ZonedDateTime.from({
        year: eventDate.getFullYear(),
        month: eventDate.getMonth() + 1,
        day: eventDate.getDate(),
        hour: endHour,
        minute: endMinute,
        timeZone: Temporal.Now.timeZoneId(),
      }),
      allDay: false,
      calendarId: e.calendarId,
      day: e.day,
    };
  });

  return events;
}
