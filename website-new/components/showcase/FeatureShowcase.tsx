'use client';

import { CalendarType, createYearView } from '@dayflow/core';
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
import React, { useMemo } from 'react';

import { getWebsiteCalendars } from '@/utils/palette';
import { generateMinimalSampleEvents } from '@/utils/sampleData';

import { CustomDetailDialogShowcase } from './CustomDetailDialogShowcase';

import '@dayflow/core/dist/styles.components.css';

type SwitcherMode = 'buttons' | 'select';

interface DemoCalendarProps {
  switcherMode?: SwitcherMode;
  useEventDetailDialog?: boolean;
  className?: string;
}

interface FeatureCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const cloneCalendarTypes = (): CalendarType[] => getWebsiteCalendars();

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  children,
}) => (
  <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900'>
    <div className='border-b border-slate-100 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-800/60'>
      <h3 className='text-xl font-semibold text-slate-900 dark:text-slate-100'>
        {title}
      </h3>
      <p className='mt-2 text-sm text-slate-600 dark:text-slate-400'>
        {description}
      </p>
    </div>
    <div className='bg-white p-6 dark:bg-slate-900'>{children}</div>
  </div>
);

const useDemoCalendar = ({
  switcherMode,
  useEventDetailDialog = false,
}: {
  switcherMode?: SwitcherMode;
  useEventDetailDialog?: boolean;
}) => {
  const { resolvedTheme } = useTheme();

  const memoizedEvents = useMemo(() => generateMinimalSampleEvents(), []);

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
  useEventDetailDialog = false,
}) => {
  const calendar = useDemoCalendar({ switcherMode, useEventDetailDialog });

  return (
    <div className='not-prose rounded-xl bg-white dark:border-slate-700 dark:bg-slate-900'>
      <DayFlowCalendar calendar={calendar} />
    </div>
  );
};

export const SwitcherModeShowcase: React.FC = () => (
  <div className='flex flex-col gap-10'>
    <div>
      <DemoCalendar switcherMode='buttons' className='h-120' />
    </div>
    <div>
      <DemoCalendar switcherMode='select' className='h-120' />
    </div>
  </div>
);

export const EventDialogShowcase: React.FC = () => (
  <DemoCalendar className='h-130' useEventDetailDialog={true} />
);

export const FeatureShowcase: React.FC = () => (
  <div className='space-y-10'>
    <FeatureCard
      title='View Switcher Modes'
      description='Switch between button and select based headers with the switcherMode prop.'
    >
      <SwitcherModeShowcase />
    </FeatureCard>

    <FeatureCard
      title='Custom Event Detail Dialog'
      description='Open a fully custom dialog when an event is selected, keeping parity with your modal system.'
    >
      <CustomDetailDialogShowcase />
    </FeatureCard>
  </div>
);

export default FeatureShowcase;
