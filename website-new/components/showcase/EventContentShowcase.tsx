/* eslint-disable @next/next/no-img-element */
'use client';

import '@dayflow/core/dist/styles.components.css';
import { Event, getLineColor } from '@dayflow/core';
import { createDragPlugin } from '@dayflow/plugin-drag';
import {
  useCalendarApp,
  DayFlowCalendar,
  createMonthView,
  createWeekView,
  createDayView,
  createYearView,
  ViewType,
} from '@dayflow/react';
import { useTheme } from 'next-themes';
import React, { useState, useMemo } from 'react';

import { getWebsiteCalendars } from '@/utils/palette';
import { generateSampleEvents } from '@/utils/sampleData';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

const EventIcon = ({
  calendarId,
  defaultIcon,
}: {
  calendarId?: string;
  defaultIcon: string;
}) => {
  if (calendarId === 'team') {
    return (
      <img
        src={`${BASE}/images/avatar/avatar1.png`}
        className='h-4 w-4 shrink-0 rounded-full object-cover'
        alt='Product Team'
      />
    );
  }
  if (calendarId === 'personal') {
    return (
      <img
        src={`${BASE}/images/avatar/avatar2.png`}
        className='h-4 w-4 shrink-0 rounded-full object-cover'
        alt='Personal'
      />
    );
  }
  return <span className='shrink-0 text-[10px]'>{defaultIcon}</span>;
};

export const EventContentShowcase: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const [events] = useState<Event[]>(generateSampleEvents());

  const themeMode = useMemo(() => {
    if (resolvedTheme === 'dark') return 'dark';
    if (resolvedTheme === 'light') return 'light';
    return 'auto';
  }, [resolvedTheme]);

  const calendar = useCalendarApp({
    views: [
      createDayView(),
      createWeekView(),
      createMonthView({
        showWeekNumbers: true,
        showMonthIndicator: false,
      }),
      createYearView({
        showTimedEventsInYearView: true,
      }),
    ],
    plugins: [createDragPlugin()],
    events: events,
    calendars: getWebsiteCalendars(),
    defaultCalendar: 'work',
    defaultView: ViewType.MONTH,
    theme: { mode: themeMode },
  });

  return (
    <div className='not-prose p-1'>
      <DayFlowCalendar
        calendar={calendar}
        eventContentDay={({ event, isSelected }) => (
          <div
            className='flex h-full flex-col justify-start overflow-hidden border-l-4'
            style={{
              borderTopLeftRadius: '4px',
              borderBottomLeftRadius: '4px',
              borderColor: getLineColor(event.calendarId || 'blue'),
            }}
          >
            <div className='flex items-center gap-1 px-0.5'>
              <span className='shrink-0 text-[10px]'>📅</span>
              <span
                className={`truncate text-xs font-semibold ${isSelected ? 'text-white' : ''}`}
              >
                {event.title}
              </span>
            </div>
            <div className='flex flex-col px-1'>
              <span
                className={`truncate text-[10px] opacity-70 ${isSelected ? 'text-white' : ''}`}
              >
                📍 {`${event.meta?.location || 'No location'}`}
              </span>
              <span
                className={`text-[10px] opacity-60 ${isSelected ? 'text-white' : ''}`}
              >
                {event.description}
              </span>
            </div>
          </div>
        )}
        eventContentWeek={({ event, isSelected }) => (
          <div
            className='flex h-full flex-col justify-start overflow-hidden border-l-4 border-black/20 pr-0.5 pl-1'
            style={{
              borderTopLeftRadius: '4px',
              borderBottomLeftRadius: '4px',
              borderColor: getLineColor(event.calendarId || 'blue'),
            }}
          >
            <div className='flex items-center gap-1 px-0.5'>
              <EventIcon calendarId={event.calendarId} defaultIcon='🗓' />
              <span
                className={`text-xs font-semibold ${isSelected ? 'text-white' : ''}`}
              >
                {event.title}
              </span>
            </div>
            <div className='flex flex-col'>
              <span
                className={`text-[9px] opacity-70 ${isSelected ? 'text-white' : ''}`}
              >
                📍 {`${event.meta?.location || 'No location'}`}
              </span>
              <span
                className={`text-[9px] opacity-60 ${isSelected ? 'text-white' : ''}`}
              >
                {event.description}
              </span>
            </div>
          </div>
        )}
        eventContentMonth={({ event }) => (
          <div className='flex items-center gap-1 overflow-hidden px-0.5'>
            <EventIcon calendarId={event.calendarId} defaultIcon='🗃' />
            <span className='truncate text-xs font-medium'>{event.title}</span>
          </div>
        )}
        eventContentYear={({ event }) => (
          <div className='flex items-center gap-1 overflow-hidden px-0.5'>
            <EventIcon calendarId={event.calendarId} defaultIcon='🗃' />
            <span className='truncate text-xs font-medium'>{event.title}</span>
          </div>
        )}
        eventContentAllDayDay={({ event }) => (
          <div className='flex h-full items-center gap-1 overflow-hidden px-0.5'>
            <EventIcon calendarId={event.calendarId} defaultIcon='☀️' />
            <span className='truncate text-xs font-medium'>{event.title}</span>
          </div>
        )}
        eventContentAllDayWeek={({ event }) => (
          <div className='flex h-full items-center gap-1 overflow-hidden px-0.5'>
            <EventIcon calendarId={event.calendarId} defaultIcon='☀️' />
            <span className='truncate text-xs font-medium'>{event.title}</span>
          </div>
        )}
        eventContentAllDayMonth={({ event }) => (
          <div className='flex h-full items-center gap-1 overflow-hidden px-0.5'>
            <EventIcon calendarId={event.calendarId} defaultIcon='☀️' />
            <span className='truncate text-xs font-medium'>{event.title}</span>
          </div>
        )}
        eventContentAllDayYear={({ event }) => (
          <div className='flex h-full items-center gap-1 overflow-hidden px-0.5'>
            <EventIcon calendarId={event.calendarId} defaultIcon='☀️' />
            <span className='truncate text-xs font-medium'>{event.title}</span>
          </div>
        )}
      />
    </div>
  );
};
