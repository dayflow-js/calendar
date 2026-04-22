import { Event } from '@dayflow/core';
import { Temporal } from 'temporal-polyfill';

const calendarIds = [
  'team',
  'personal',
  'learning',
  'travel',
  'wellness',
  'marketing',
  'support',
];

const titles = [
  'Product Sync',
  'Design Review',
  'Customer Call',
  'Weekly Planning',
  'Deep Work',
  'Code Review',
  'Brainstorm',
  'Usability Test',
  'Team Retro',
  'Partner Demo',
  'Lunch & Learn',
  'Yoga Break',
  'Travel Block',
  'Hiring Interview',
  'Content Planning',
];

const locations = [
  'Conference Room A',
  'Meeting Room 302',
  'Zoom Meeting',
  'Main Office, 4th Floor',
  'Starbucks Coffee',
  'Community Center',
  'Innovation Hub',
  'Building 5, Lab 2',
];

const eventDetails: Record<string, { description: string; location?: string }> =
  {
    'Product Sync': {
      description: 'Sync up on the latest product roadmap and milestones.',
      location: 'Room 101',
    },
    'Design Review': {
      description:
        'Review the new UI/UX designs for the upcoming mobile app release.',
      location: 'Design Studio',
    },
    'Customer Call': {
      description:
        'Discussion with key clients regarding feature requests and feedback.',
      location: 'Virtual',
    },
    'Weekly Planning': {
      description: 'Plan tasks and priorities for the upcoming week.',
      location: 'Main Hall',
    },
    'Deep Work': {
      description: 'Focus time for intense development and problem solving.',
      location: 'Quiet Zone',
    },
    'Code Review': {
      description: 'Review pull requests and ensure code quality standards.',
      location: 'Dev Corner',
    },
    Brainstorm: {
      description: 'Ideation session for the next big feature.',
      location: 'Whiteboard Room',
    },
    'Usability Test': {
      description: 'Observe users interacting with the latest prototype.',
      location: 'User Lab',
    },
    'Team Retro': {
      description: 'Reflect on the past sprint and discuss improvements.',
      location: 'Common Area',
    },
    'Partner Demo': {
      description: 'Demonstrate our latest capabilities to potential partners.',
      location: 'Executive Suite',
    },
    'Lunch & Learn': {
      description: 'Educational session over lunch about new technologies.',
      location: 'Cafeteria',
    },
    'Yoga Break': {
      description: 'Stretch and relax with a quick yoga session.',
      location: 'Wellness Room',
    },
    'Travel Block': {
      description: 'Time allocated for travel and logistics.',
      location: 'Airport Terminal',
    },
    'Hiring Interview': {
      description: 'Interviewing candidates for the Senior Engineer position.',
      location: 'HR Office',
    },
    'Content Planning': {
      description: 'Plan the editorial calendar and upcoming blog posts.',
      location: 'Marketing Hub',
    },
  };

// Simple deterministic random number generator
const createRandom = (seed: number) => {
  let s = seed;
  return () => {
    const x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  };
};

const createRandomInt = (random: () => number) => (min: number, max: number) =>
  Math.floor(random() * (max - min + 1)) + min;

const DEFAULT_TIME_ZONE = Temporal.Now.timeZoneId();

const createTimedEvent = (
  baseDate: Temporal.PlainDate,
  index: number,
  randomInt: (min: number, max: number) => number
): Event => {
  const title = titles[index % titles.length];
  const details = eventDetails[title] || {
    description: 'General event details.',
    location: locations[index % locations.length],
  };

  // Keep sample events concentrated in local working hours for easier testing.
  const startHour = randomInt(8, 15);
  const maxDuration = Math.max(1, 17 - startHour);
  const duration = Math.max(1, randomInt(1, Math.min(3, maxDuration)));

  const startPlain = baseDate.toPlainDateTime({
    hour: startHour,
    minute: randomInt(0, 1) ? 30 : 0,
  });

  const start = Temporal.ZonedDateTime.from({
    timeZone: DEFAULT_TIME_ZONE,
    year: startPlain.year,
    month: startPlain.month,
    day: startPlain.day,
    hour: startPlain.hour,
    minute: startPlain.minute,
  });

  const end = start.add({ hours: duration });

  return {
    id: `event-${index}`,
    title: title,
    description: details.description,
    start,
    end,
    calendarId: calendarIds[index % calendarIds.length],
    meta: {
      location: details.location || locations[index % locations.length],
    },
  };
};

const createAllDayEvent = (
  start: Temporal.PlainDate,
  span: number,
  index: number,
  calendarId: string,
  title: string
): Event => {
  const details = eventDetails[title] || {
    description: 'All day event details.',
    location: 'Various',
  };
  return {
    id: `all-day-${index}`,
    title,
    description: details.description,
    start,
    end: start.add({ days: span }),
    allDay: true,
    calendarId,
    icon: true,
    meta: {
      location: details.location || 'Multiple Locations',
    },
  };
};

const baseAllDayDefinitions: Array<{
  offset: number;
  span: number;
  calendarId: string;
  title: string;
}> = [
  { offset: -6, span: 2, calendarId: 'team', title: 'Sprint Offsite' },
  { offset: -2, span: 0, calendarId: 'personal', title: 'Family Day' },
  { offset: 3, span: 1, calendarId: 'travel', title: 'Client Visit' },
  { offset: 7, span: 2, calendarId: 'marketing', title: 'Campaign Launch' },
  { offset: 12, span: 0, calendarId: 'learning', title: 'Conference' },
  { offset: 16, span: 3, calendarId: 'wellness', title: 'Wellness Retreat' },
  { offset: 20, span: 1, calendarId: 'support', title: 'Support Rotation' },
];

/** Multi-calendar sample events that demonstrate calendarIds support. */
export const generateMultiCalendarEvents = (): Event[] => {
  const today = Temporal.Now.plainDateISO();
  const tz = Temporal.Now.timeZoneId();

  const makeZoned = (
    date: Temporal.PlainDate,
    hour: number,
    minute = 0
  ): Temporal.ZonedDateTime =>
    Temporal.ZonedDateTime.from({
      timeZone: tz,
      year: date.year,
      month: date.month,
      day: date.day,
      hour,
      minute,
    });

  return [
    // Two-calendar timed event — today
    {
      id: 'multi-cal-1',
      title: 'Family Dance Workshop',
      description: 'Shared across the whole family calendar.',
      start: makeZoned(today, 10),
      end: makeZoned(today, 11, 30),
      calendarIds: ['personal', 'wellness'],
      meta: { location: 'Community Center' },
    },
    // Three-calendar timed event — tomorrow
    {
      id: 'multi-cal-2',
      title: 'All-Hands Sprint Planning',
      description: 'Cross-team planning session.',
      start: makeZoned(today.add({ days: 1 }), 14),
      end: makeZoned(today.add({ days: 1 }), 16),
      calendarIds: ['team', 'marketing', 'support'],
      meta: { location: 'Main Hall' },
    },
    // Four-calendar all-day event — spans today + 2 days
    {
      id: 'multi-cal-3',
      title: 'Company Off-site',
      description: 'Belongs to every team calendar.',
      start: today.add({ days: 3 }),
      end: today.add({ days: 5 }),
      allDay: true,
      icon: true,
      calendarIds: ['team', 'personal', 'travel', 'learning'],
    },
    // Two-calendar timed event — yesterday (tests backward visibility)
    {
      id: 'multi-cal-4',
      title: 'Retrospective + Wellness Check',
      description: 'Weekly retro combined with wellness review.',
      start: makeZoned(today.subtract({ days: 1 }), 15),
      end: makeZoned(today.subtract({ days: 1 }), 16),
      calendarIds: ['team', 'wellness'],
      meta: { location: 'Zoom' },
    },
  ];
};

export const generateSampleEvents = (): Event[] => {
  const today = Temporal.Now.plainDateISO();
  const windowStart = today.subtract({ days: 24 });
  const events: Event[] = [];

  // Initialize deterministic random generator
  const random = createRandom(12345);
  const randomInt = createRandomInt(random);

  for (let offset = 0; offset < 56; offset += 1) {
    const date = windowStart.add({ days: offset });
    const dayEvents = randomInt(2, 4);
    for (let i = 0; i < dayEvents; i += 1) {
      events.push(createTimedEvent(date, offset * 10 + i, randomInt));
    }
  }
  baseAllDayDefinitions.forEach((definition, index) => {
    const start = today.add({ days: definition.offset });
    const span = Math.max(0, definition.span);
    events.push(
      createAllDayEvent(
        start,
        span,
        index,
        definition.calendarId,
        definition.title
      )
    );
  });

  // Append multi-calendar demo events
  events.push(...generateMultiCalendarEvents());

  // Annual events for Year View demonstration
  const currentYear = today.year;
  const annualEvents = [
    // Jan: New Year & Kickoff
    {
      month: 1,
      day: 1,
      span: 3,
      calendarId: 'personal',
      title: 'New Year Holiday',
    },
    {
      month: 1,
      day: 15,
      span: 5,
      calendarId: 'team',
      title: 'Annual Kickoff Week',
    },
    {
      month: 1,
      day: 25,
      span: 3,
      calendarId: 'learning',
      title: 'Goal Setting Workshop',
    },

    // Feb-Mar: Work Focus
    {
      month: 2,
      day: 5,
      span: 4,
      calendarId: 'team',
      title: 'Q1 Strategy Offsite',
    },
    {
      month: 2,
      day: 14,
      span: 3,
      calendarId: 'personal',
      title: "Valentine's Trip",
    },
    {
      month: 2,
      day: 26,
      span: 4,
      calendarId: 'learning',
      title: 'Tech Conference',
    },
    {
      month: 3,
      day: 10,
      span: 4,
      calendarId: 'team',
      title: 'Design Sprint Week',
    },
    {
      month: 3,
      day: 24,
      span: 4,
      calendarId: 'marketing',
      title: 'Product Launch Week',
    },

    // Apr-May: Conferences & Holidays
    {
      month: 4,
      day: 12,
      span: 5,
      calendarId: 'travel',
      title: 'Spring Team Building',
    },
    {
      month: 4,
      day: 25,
      span: 3,
      calendarId: 'personal',
      title: 'Anniversary Trip',
    },
    {
      month: 5,
      day: 1,
      span: 3,
      calendarId: 'personal',
      title: 'Labour Day Holiday',
    },
    {
      month: 5,
      day: 15,
      span: 4,
      calendarId: 'learning',
      title: 'Developer Summit',
    },
    {
      month: 5,
      day: 28,
      span: 3,
      calendarId: 'marketing',
      title: 'Brand Workshop',
    },

    // Jun-Jul: Travel & Vacation
    {
      month: 6,
      day: 10,
      span: 4,
      calendarId: 'support',
      title: 'Quarterly Review',
    },
    {
      month: 6,
      day: 15,
      span: 14,
      calendarId: 'travel',
      title: 'Summer Vacation (Europe)',
    },
    {
      month: 7,
      day: 8,
      span: 4,
      calendarId: 'team',
      title: 'Mid-Year Review Week',
    },
    {
      month: 7,
      day: 20,
      span: 5,
      calendarId: 'wellness',
      title: 'Hiking Trip',
    },

    // Aug-Sep: Projects & Learning
    { month: 8, day: 12, span: 6, calendarId: 'team', title: 'Hackathon Week' },
    {
      month: 8,
      day: 25,
      span: 3,
      calendarId: 'wellness',
      title: 'Wellness Retreat',
    },
    {
      month: 9,
      day: 5,
      span: 3,
      calendarId: 'learning',
      title: 'Leadership Training',
    },
    {
      month: 9,
      day: 18,
      span: 4,
      calendarId: 'travel',
      title: 'Client Roadshow',
    },

    // Oct-Nov: Q4 Push
    {
      month: 10,
      day: 10,
      span: 5,
      calendarId: 'team',
      title: 'Q4 Planning Week',
    },
    {
      month: 10,
      day: 31,
      span: 3,
      calendarId: 'personal',
      title: 'Halloween Weekend',
    },
    {
      month: 11,
      day: 15,
      span: 5,
      calendarId: 'marketing',
      title: 'Black Friday Prep',
    },
    {
      month: 11,
      day: 24,
      span: 3,
      calendarId: 'personal',
      title: 'Thanksgiving Holiday',
    },

    // Dec: Holidays
    {
      month: 12,
      day: 10,
      span: 3,
      calendarId: 'team',
      title: 'Year End Party Trip',
    },
    {
      month: 12,
      day: 24,
      span: 5,
      calendarId: 'personal',
      title: 'Christmas Holiday',
    },
    {
      month: 12,
      day: 29,
      span: 4,
      calendarId: 'travel',
      title: 'New Year Ski Trip',
    },
  ];

  annualEvents.forEach((def, index) => {
    try {
      const start = Temporal.PlainDate.from({
        year: currentYear,
        month: def.month,
        day: def.day,
      });
      events.push(
        createAllDayEvent(
          start,
          def.span,
          2000 + index, // Use a high base index to avoid collisions
          def.calendarId,
          def.title
        )
      );
    } catch {
      // Ignore invalid dates (e.g. leap years edge cases in simple config)
    }
  });

  return events;
};

export const generateMinimalSampleEvents = (): Event[] => {
  const today = Temporal.Now.plainDateISO();
  const windowStart = today.subtract({ days: 3 });
  const events: Event[] = [];

  const random = createRandom(54321);
  const randomInt = createRandomInt(random);

  for (let offset = 0; offset < 7; offset += 1) {
    const date = windowStart.add({ days: offset });
    const dayEvents = randomInt(1, 2);
    for (let i = 0; i < dayEvents; i += 1) {
      events.push(createTimedEvent(date, offset * 10 + i, randomInt));
    }
  }

  // Add just a couple of all-day events
  events.push(
    createAllDayEvent(
      today.subtract({ days: 1 }),
      2,
      999,
      'team',
      'Minimal Team Event'
    )
  );

  return events;
};
