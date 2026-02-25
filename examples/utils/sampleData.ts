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

const DEFAULT_TIME_ZONE = 'UTC'; // Use UTC for consistency

const createTimedEvent = (
  baseDate: Temporal.PlainDate,
  index: number,
  randomInt: (min: number, max: number) => number
): Event => {
  const startHour = randomInt(8, 18);
  const duration = Math.max(1, randomInt(1, 3));

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
    title: titles[index % titles.length],
    start,
    end,
    calendarId: calendarIds[index % calendarIds.length],
  };
};

const createAllDayEvent = (
  start: Temporal.PlainDate,
  span: number,
  index: number,
  calendarId: string,
  title: string
): Event => ({
  id: `all-day-${index}`,
  title,
  start,
  end: start.add({ days: span }),
  allDay: true,
  calendarId,
  icon: true,
});

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
