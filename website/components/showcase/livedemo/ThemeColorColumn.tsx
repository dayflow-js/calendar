'use client';

import {
  BlossomColorPicker,
  hexToHsl,
  lightnessToSliderValue,
} from '@dayflow/blossom-color-picker-react';
import type {
  BlossomColorPickerColor,
  BlossomColorPickerValue,
} from '@dayflow/blossom-color-picker-react';
import { CircleAlert } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { CalendarSelections } from './types';

interface ThemeColorColumnProps {
  themeColor: string;
  onPreviewThemeColor: (color: string) => void;
  onUpdateSelections: (updates: Partial<CalendarSelections>) => void;
}

const getBlossomValueFromHex = (hex: string): BlossomColorPickerValue => {
  const { h, s, l } = hexToHsl(hex);

  return {
    hue: h,
    saturation: lightnessToSliderValue(l),
    lightness: l,
    originalSaturation: s,
    alpha: 100,
    layer: l >= 75 ? 'inner' : 'outer',
  };
};

export function ThemeColorColumn({
  themeColor,
  onPreviewThemeColor,
  onUpdateSelections,
}: ThemeColorColumnProps) {
  const themePreviewRef = useRef<HTMLDivElement>(null);
  const blossomThemeValue = useMemo(
    () => getBlossomValueFromHex(themeColor),
    [themeColor]
  );

  useEffect(() => {
    themePreviewRef.current?.style.setProperty(
      '--df-live-demo-theme-color',
      themeColor
    );
  }, [themeColor]);

  const handleThemePreview = useCallback(
    (color: BlossomColorPickerColor) => {
      themePreviewRef.current?.style.setProperty(
        '--df-live-demo-theme-color',
        color.hex
      );
      onPreviewThemeColor(color.hex);
    },
    [onPreviewThemeColor]
  );

  const handleThemeCommit = useCallback(
    (color: BlossomColorPickerColor) => {
      handleThemePreview(color);
      onUpdateSelections({ themeColor: color.hex });
    },
    [handleThemePreview, onUpdateSelections]
  );

  return (
    <div
      ref={themePreviewRef}
      className='relative z-50 space-y-1'
      style={
        {
          '--df-live-demo-theme-color': themeColor,
          '--df-color-primary': themeColor,
        } as React.CSSProperties
      }
    >
      <div className='flex items-center gap-1'>
        <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
          Theme
        </h3>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className='inline-flex cursor-help items-center'>
              <CircleAlert className='h-3 w-3 text-slate-400' />
            </div>
          </TooltipTrigger>
          <TooltipContent
            side='top'
            className='w-80 overflow-hidden border-slate-200 p-0 shadow-xl dark:border-slate-800'
          >
            <div className='border-b border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900'>
              <p className='mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100'>
                Theme Preview
              </p>
              <p className='text-[11px] leading-relaxed text-slate-500 dark:text-slate-400'>
                Controls the primary accent color for the calendar, including
                today&apos;s highlight and timeline indicators.
              </p>
            </div>
            <div className='space-y-4 bg-white p-3 dark:bg-slate-950'>
              <div className='space-y-1.5'>
                <p className='text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                  Today Highlight
                </p>
                <div className='relative h-26 overflow-hidden rounded-md border border-slate-100 bg-white p-2 dark:border-slate-800 dark:bg-slate-950'>
                  <div
                    className='absolute top-2 right-4 flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-white'
                    style={{
                      backgroundColor: themeColor,
                    }}
                  >
                    22
                  </div>

                  <div className='absolute right-2 bottom-3 left-2 space-y-1'>
                    <div className='flex h-6 items-center gap-2 rounded-r-md bg-blue-50 pr-2 pl-1 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300'>
                      <span className='h-5 w-1 shrink-0 rounded-full bg-blue-500' />
                      <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                        Product Sync
                      </span>
                      <span className='shrink-0 text-sm font-medium'>
                        08:30
                      </span>
                    </div>
                    <div className='flex h-6 items-center gap-2 rounded-r-md bg-orange-50 pr-2 pl-1 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300'>
                      <span className='h-5 w-1 shrink-0 rounded-full bg-orange-500' />
                      <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                        Design Review
                      </span>
                      <span className='shrink-0 text-sm font-medium'>
                        10:30
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className='space-y-1.5'>
                <p className='text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                  Current Timeline
                </p>
                <div className='relative h-24 overflow-hidden rounded-md border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950'>
                  <div className='absolute inset-y-0 left-0 w-16 bg-white dark:bg-slate-950'>
                    <span className='absolute top-2 right-2 text-xs font-medium text-slate-500 dark:text-slate-400'>
                      09:00
                    </span>
                    <span className='absolute right-2 bottom-2 text-xs font-medium text-slate-500 dark:text-slate-400'>
                      10:00
                    </span>
                  </div>

                  <div className='absolute top-3 right-0 left-16 h-px bg-slate-200 dark:bg-slate-800' />
                  <div className='absolute right-0 bottom-3 left-16 h-px bg-slate-200 dark:bg-slate-800' />
                  <div className='absolute top-0 bottom-0 left-[calc(4rem+25%)] w-px bg-slate-100 dark:bg-slate-800' />
                  <div className='absolute top-0 bottom-0 left-[calc(4rem+50%)] w-px bg-slate-100 dark:bg-slate-800' />
                  <div className='absolute top-0 bottom-0 left-[calc(4rem+75%)] w-px bg-slate-100 dark:bg-slate-800' />

                  <div className='absolute top-1/2 right-0 left-4 flex -translate-y-1/2 items-center'>
                    <div
                      className='mr-0 rounded px-1.5 py-0.5 text-[11px] font-bold text-white'
                      style={{
                        backgroundColor: themeColor,
                      }}
                    >
                      09:30
                    </div>
                    <div className='flex flex-1 items-center'>
                      {[0, 1, 2, 3].map(idx => (
                        <div key={idx} className='flex flex-1 items-center'>
                          <div
                            className='relative h-0.5 w-full'
                            style={{
                              backgroundColor: `color-mix(in srgb, ${themeColor} 32%, transparent)`,
                            }}
                          >
                            {idx === 0 && (
                              <span
                                className='absolute top-1/2 -left-1 h-2.5 w-2.5 -translate-y-1/2 rounded-full'
                                style={{
                                  backgroundColor: themeColor,
                                }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className='flex h-8 w-8 items-center justify-center'>
        <BlossomColorPicker
          key={themeColor}
          defaultValue={blossomThemeValue}
          coreSize={28}
          petalSize={26}
          showAlphaSlider={true}
          onCollapse={handleThemeCommit}
          onChange={handleThemePreview}
        />
      </div>
    </div>
  );
}
