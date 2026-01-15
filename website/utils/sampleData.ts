import { Temporal } from 'temporal-polyfill';
import type { Event } from '@dayflow/core';

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

  return events;
};
