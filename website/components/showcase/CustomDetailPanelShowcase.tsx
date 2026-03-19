'use client';

import {
  Event,
  CalendarType,
  EventDetailContentProps,
  createYearView,
  EventDetailDialogProps,
} from '@dayflow/core';
import { createDragPlugin } from '@dayflow/plugin-drag';
import {
  useCalendarApp,
  DayFlowCalendar,
  createMonthView,
  createWeekView,
  createDayView,
  ViewType,
} from '@dayflow/react';
import { useTheme } from 'next-themes';
import React, { useMemo, useCallback } from 'react';

import { getWebsiteCalendars } from '@/utils/palette';
import { generateMinimalSampleEvents } from '@/utils/sampleData';

import '@dayflow/core/dist/styles.components.css';

type SwitcherMode = 'buttons' | 'select';

interface DemoCalendarProps {
  switcherMode?: SwitcherMode;
  customDetailPanelContent?: (args: EventDetailContentProps) => React.ReactNode;
  customEventDetailDialog?: (args: EventDetailDialogProps) => React.ReactNode;
  useEventDetailDialog?: boolean;
  className?: string;
}

const cloneCalendarTypes = (): CalendarType[] => getWebsiteCalendars();

const META_PRESETS = [
  {
    owner: 'Alice',
    location: 'HQ West · Room 301',
    attendees: ['Brian', 'Chiara', 'Diego'],
    favorite: true,
  },
  {
    owner: 'Brian',
    location: 'Zoom',
    attendees: ['Alice', 'Product Design'],
    favorite: false,
  },
  {
    owner: 'Chiara',
    location: 'Local Bistro',
    attendees: ['Ops', 'Marketing'],
    favorite: false,
  },
  {
    owner: 'Diego',
    location: 'Online broadcast',
    attendees: ['Stakeholders', 'Engineering'],
    favorite: false,
  },
  {
    owner: 'Mina',
    location: 'HQ East · Innovation Lab',
    attendees: ['Research', 'Growth'],
    favorite: true,
  },
  {
    owner: 'Noah',
    location: 'Client HQ',
    attendees: ['Customer team', 'Support'],
    favorite: false,
  },
];

const enrichEventsWithMeta = (sourceEvents: Event[]): Event[] =>
  sourceEvents.map((event, index) => {
    const preset = META_PRESETS[index % META_PRESETS.length];
    return {
      ...event,
      meta: {
        ...event.meta,
        ...preset,
        favorite:
          typeof preset.favorite === 'boolean'
            ? preset.favorite
            : index % 4 === 0,
      },
    };
  });

const formatTemporal = (value: Event['start']) => {
  try {
    return value.toString();
  } catch {
    return String(value);
  }
};

const useDemoCalendar = ({
  switcherMode,
  events,
  useEventDetailDialog = false,
}: {
  switcherMode?: SwitcherMode;
  events?: Event[];
  useEventDetailDialog?: boolean;
}) => {
  const { resolvedTheme } = useTheme();

  const memoizedEvents = useMemo(() => {
    if (events) {
      return events;
    }
    return enrichEventsWithMeta(generateMinimalSampleEvents());
  }, [events]);

  const views = useMemo(
    () => [
      createDayView(),
      createWeekView(),
      createMonthView(),
      createYearView({ mode: 'fixed-week' }),
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
  const calendars = useMemo(() => cloneCalendarTypes(), []);

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
    switcherMode: switcherMode ?? 'buttons',
    theme: { mode: themeMode },
    useEventDetailDialog,
  });
};

const DemoCalendar: React.FC<DemoCalendarProps> = ({
  switcherMode,
  customDetailPanelContent,
  // customEventDetailDialog,
  useEventDetailDialog = false,
}) => {
  const calendar = useDemoCalendar({ switcherMode, useEventDetailDialog });

  return (
    <div className='rounded-xl bg-white dark:border-slate-700 dark:bg-gray-900'>
      <DayFlowCalendar
        calendar={calendar}
        eventDetailContent={customDetailPanelContent}
      />
    </div>
  );
};

export const CustomDetailPanelShowcase: React.FC = () => {
  const detailPanel = useCallback(
    ({
      event,
      onEventDelete,
      onEventUpdate,
      onClose,
    }: EventDetailContentProps) => {
      const meta = event.meta ?? {};
      const isFavorite = Boolean(meta.favorite);

      const handleToggleFavorite = () => {
        const updatedEvent: Event = {
          ...event,
          meta: {
            ...meta,
            favorite: !isFavorite,
          },
        };
        onEventUpdate(updatedEvent);
      };

      const handleDelete = () => {
        onEventDelete(event.id);
        onClose?.();
      };

      return (
        <div className='space-y-3'>
          <div className='flex items-start justify-between'>
            <div>
              <h5 className='text-base font-semibold text-slate-900 dark:text-slate-100'>
                {event.title}
              </h5>
              <p className='mt-0.5 text-xs text-slate-500 dark:text-slate-400'>
                {formatTemporal(event.start)} → {formatTemporal(event.end)}
              </p>
            </div>
            {isFavorite && (
              <span className='text-sm font-semibold text-amber-500'>
                ★ Favorite
              </span>
            )}
          </div>

          {event.description && (
            <p className='text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
              {event.description}
            </p>
          )}

          <div className='grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400'>
            <div>
              <span className='font-medium text-slate-700 dark:text-slate-200'>
                Owner:
              </span>
              <span>{`${meta.owner ?? 'Unassigned'}`}</span>
            </div>
            <div>
              <span className='font-medium text-slate-700 dark:text-slate-200'>
                Location:
              </span>
              <span>{`${meta.location ?? 'TBD'}`}</span>
            </div>
          </div>

          <div className='flex justify-end gap-2 pt-2'>
            <button
              type='button'
              onClick={handleToggleFavorite}
              className='rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200'
            >
              {isFavorite ? 'Remove favorite' : 'Add to favorites'}
            </button>
            <button
              type='button'
              onClick={handleDelete}
              className='rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:bg-red-900/30 dark:text-red-200'
            >
              Delete event
            </button>
          </div>
        </div>
      );
    },
    []
  );

  return (
    <div className='not-prose p-1'>
      <DemoCalendar customDetailPanelContent={detailPanel} className='h-130' />
    </div>
  );
};

export default CustomDetailPanelShowcase;
