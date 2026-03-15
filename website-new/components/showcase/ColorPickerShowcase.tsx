'use client';

import {
  ColorPickerProps,
  CreateCalendarDialogColorPickerProps,
} from '@dayflow/core';
import { createSidebarPlugin } from '@dayflow/plugin-sidebar';
import {
  useCalendarApp,
  DayFlowCalendar,
  createMonthView,
  createWeekView,
  ViewType,
} from '@dayflow/react';
import React, { useMemo } from 'react';
import { SketchPicker, PhotoshopPicker } from 'react-color';

import { getWebsiteCalendars } from '@/utils/palette';
import { generateMinimalSampleEvents } from '@/utils/sampleData';

export function ColorPickerShowcase() {
  const events = useMemo(() => generateMinimalSampleEvents(), []);
  const calendars = useMemo(() => getWebsiteCalendars(), []);

  const calendar = useCalendarApp({
    views: [createMonthView(), createWeekView()],
    plugins: [
      createSidebarPlugin({
        createCalendarMode: 'modal',
      }),
    ],
    defaultView: ViewType.WEEK,
    events,
    calendars,
    initialDate: new Date(),
  });

  return (
    <div className='not-prose w-full overflow-hidden rounded-lg p-1'>
      <DayFlowCalendar
        calendar={calendar}
        colorPicker={(args: ColorPickerProps) => (
          <div className='relative'>
            <div className='absolute top-0 left-0 z-9999'>
              <SketchPicker
                color={args.color}
                onChange={color => args.onChange({ hex: color.hex })}
                width='220px'
              />
            </div>
          </div>
        )}
        createCalendarDialogColorPicker={(
          args: CreateCalendarDialogColorPickerProps
        ) => (
          <div className='flex items-center justify-center p-4'>
            <PhotoshopPicker
              color={args.color}
              onChange={color => args.onChange({ hex: color.hex })}
              onAccept={() => args.onAccept?.()}
              onCancel={() => args.onCancel?.()}
            />
          </div>
        )}
      />
    </div>
  );
}

export default ColorPickerShowcase;
