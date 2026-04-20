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

import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
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
  <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-900'>
    <div className='border-b border-slate-100 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-800/60'>
      <h3 className='text-xl font-semibold text-slate-900 dark:text-slate-100'>
        {title}
      </h3>
      <p className='mt-2 text-sm text-slate-600 dark:text-slate-400'>
        {description}
      </p>
    </div>
    <div className='bg-white p-6 dark:bg-gray-900'>{children}</div>
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
  className,
}) => {
  const calendar = useDemoCalendar({ switcherMode, useEventDetailDialog });

  return (
    <div
      className={`not-prose rounded-xl bg-white dark:border-slate-700 dark:bg-gray-900 ${className ?? ''}`}
    >
      <DayFlowCalendar calendar={calendar} />
    </div>
  );
};

export const SwitcherModeShowcase: React.FC = () => {
  const [mode, setMode] = React.useState<SwitcherMode>('buttons');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className='calendar-wrapper w-full' style={{ minHeight: '600px' }} />
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className='flex w-full flex-col gap-6'>
        <Card className='border-slate-200 bg-slate-50/50 shadow-none dark:border-slate-800 dark:bg-gray-900/50'>
          <CardContent className='flex flex-col gap-3 px-4 py-2'>
            <div className='flex items-start justify-between gap-8'>
              <div className='space-y-1'>
                <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
                  Switcher Mode
                </h3>
                <Select
                  value={mode}
                  onValueChange={value => setMode(value as SwitcherMode)}
                >
                  <SelectTrigger className='h-7 w-35 text-xs'>
                    <SelectValue placeholder='Select mode' />
                  </SelectTrigger>
                  <SelectContent className='max-h-80 w-35 overflow-hidden p-0'>
                    <SelectItem
                      value='buttons'
                      className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                    >
                      Button
                    </SelectItem>
                    <SelectItem
                      value='select'
                      className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                    >
                      Select
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        <DemoCalendar switcherMode={mode} className='h-[750px]' />
      </div>
    </TooltipProvider>
  );
};

export const EventDialogShowcase: React.FC = () => (
  <DemoCalendar className='h-[750px]' useEventDetailDialog={true} />
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
