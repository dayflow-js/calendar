'use client';

import { createAgendaView, createYearView } from '@dayflow/core';
import type { Event, MobileEventProps } from '@dayflow/core';
import { createDragPlugin } from '@dayflow/plugin-drag';
import {
  DayFlowCalendar,
  ViewType,
  createDayView,
  createMonthView,
  createWeekView,
  useCalendarApp,
} from '@dayflow/react';
import { CalendarDays, Check, ChevronLeft, Clock3, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import { getWebsiteCalendars } from '@/utils/palette';
import { generateSampleEvents } from '@/utils/sampleData';

type DraftEvent = NonNullable<MobileEventProps['draftEvent']>;

const toJsDate = (value: DraftEvent['start'] | DraftEvent['end']) => {
  if (!value) return new Date();

  if (value instanceof Date) {
    return value;
  }

  const asString =
    typeof value === 'object' && value !== null && 'toString' in value
      ? value.toString()
      : String(value);

  const parsed = new Date(asString);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const useDemoCalendar = () => {
  const { resolvedTheme } = useTheme();

  const memoizedEvents = useMemo(() => generateSampleEvents(), []);

  const views = useMemo(
    () => [
      createDayView({
        scrollToCurrentTime: true,
      }),
      createWeekView({
        scrollToCurrentTime: true,
      }),
      createMonthView(),
      createYearView({ mode: 'fixed-week' }),
      createAgendaView(),
    ],
    []
  );

  const dragPlugin = useMemo(
    () =>
      createDragPlugin({
        enableDrag: true,
        enableResize: true,
        enableCreate: true,
      }),
    []
  );

  const calendars = useMemo(() => getWebsiteCalendars(), []);

  const themeMode = useMemo(() => {
    if (resolvedTheme === 'dark') return 'dark';
    if (resolvedTheme === 'light') return 'light';
    return 'auto';
  }, [resolvedTheme]);

  return useCalendarApp({
    views,
    plugins: [dragPlugin],
    events: memoizedEvents,
    calendars,
    defaultView: ViewType.MONTH,
    initialDate: new Date(),
    switcherMode: 'buttons',
    theme: { mode: themeMode },
  });
};

const phoneViewportStyle = {
  '--df-calendar-height': '100dvh',
} as CSSProperties;

const DemoMobileEventDrawer = ({
  isOpen,
  onClose,
  onSave,
  onEventDelete,
  draftEvent,
  accentColor,
}: MobileEventProps & {
  accentColor: string;
}) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen || !draftEvent) return;
    setTitle(draftEvent.title ?? '');
    setNotes(draftEvent.description ?? '');
  }, [draftEvent, isOpen]);

  if (!isOpen || !draftEvent) return null;

  const start = toJsDate(draftEvent.start);
  const end = toJsDate(draftEvent.end);

  const handleSave = () => {
    onSave({
      ...draftEvent,
      title: title.trim() || 'Untitled event',
      description: notes.trim(),
    } as Event);
  };

  return (
    <div className='fixed inset-0 z-[100] flex flex-col bg-white dark:bg-slate-950'>
      <header className='flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950'>
        <button
          type='button'
          onClick={onClose}
          className='rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          aria-label='Close mobile event detail'
        >
          <ChevronLeft size={22} />
        </button>

        <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
          {draftEvent.id ? 'Event details' : 'New event'}
        </p>

        <button
          type='button'
          onClick={handleSave}
          className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-500'
          aria-label='Save event'
        >
          <Check size={18} />
        </button>
      </header>

      <div className='flex-1 overflow-y-auto bg-slate-50 px-4 py-5 dark:bg-slate-950'>
        <div className='space-y-4'>
          <section className='overflow-hidden rounded bg-white shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800'>
            <div className='flex'>
              <div
                className='w-1.5 shrink-0 self-stretch'
                style={{ backgroundColor: accentColor }}
              />
              <div className='min-w-0 flex-1 space-y-4 p-4'>
                <input
                  type='text'
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  placeholder='Add title'
                  className='w-full border-0 bg-transparent text-xl font-semibold text-slate-950 outline-none placeholder:text-slate-400 dark:text-slate-50'
                  autoFocus
                />

                <textarea
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  placeholder='Notes'
                  rows={3}
                  className='w-full resize-none border-0 bg-transparent text-sm leading-6 text-slate-600 outline-none placeholder:text-slate-400 dark:text-slate-300'
                />
              </div>
            </div>
          </section>

          <section className='overflow-hidden rounded bg-white shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800'>
            <div className='flex items-start gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800'>
              <CalendarDays
                size={18}
                className='mt-1 text-slate-400 dark:text-slate-500'
              />
              <div className='min-w-0'>
                <p className='text-sm font-medium text-slate-900 dark:text-slate-100'>
                  {start.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
                  Starts{' '}
                  {start.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <div className='flex items-start gap-3 px-4 py-4'>
              <Clock3
                size={18}
                className='mt-1 text-slate-400 dark:text-slate-500'
              />
              <div className='min-w-0'>
                <p className='text-sm font-medium text-slate-900 dark:text-slate-100'>
                  {end.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
                  Ends{' '}
                  {end.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </section>

          {draftEvent.id && onEventDelete && (
            <button
              type='button'
              onClick={() => onEventDelete(draftEvent.id)}
              className='flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 ring-1 ring-red-100 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/70 dark:hover:bg-red-950/60'
            >
              <Trash2 size={16} />
              Delete event
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const MobileEventDetailSimulator = () => {
  const calendar = useDemoCalendar();

  return (
    <div
      className='h-[100dvh] overflow-hidden bg-white dark:bg-slate-950'
      style={phoneViewportStyle}
    >
      <DayFlowCalendar
        calendar={calendar}
        mobileEventDetail={(args: MobileEventProps) => {
          const accentColor =
            calendar.app
              .getCalendars()
              .find(item => item.id === args.draftEvent?.calendarId)?.colors
              ?.lineColor ?? '#3b82f6';

          return <DemoMobileEventDrawer {...args} accentColor={accentColor} />;
        }}
      />
    </div>
  );
};

export default MobileEventDetailSimulator;
