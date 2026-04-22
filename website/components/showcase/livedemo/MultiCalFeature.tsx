'use client';

import { CircleAlert } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { CalendarFeatures } from './types';

interface MultiCalFeatureProps {
  checked: boolean;
  onUpdateFeatures: (updates: Partial<CalendarFeatures>) => void;
}

export function MultiCalFeature({
  checked,
  onUpdateFeatures,
}: MultiCalFeatureProps) {
  return (
    <div className='flex items-center space-x-2'>
      <Checkbox
        id='multi-calendar'
        checked={checked}
        onCheckedChange={newChecked =>
          onUpdateFeatures({ showMultiCalendar: newChecked === true })
        }
        className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
      />
      <div className='flex items-center gap-1'>
        <Label
          htmlFor='multi-calendar'
          className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
        >
          Multi Cal
        </Label>
        <Tooltip>
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
              <p className='mb-1 text-sm font-semibold'>
                Multi-calendar Events
              </p>
              <p className='text-[11px] leading-relaxed text-slate-500 dark:text-slate-400'>
                Display a single event across multiple calendars. Perfect for
                shared team activities or cross-functional blocks.
              </p>
            </div>
            <div className='space-y-4 bg-white p-3 dark:bg-slate-950'>
              <div className='space-y-1.5'>
                <p className='text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                  Week View Preview (Personal, Wellness)
                </p>
                <div
                  className='relative flex h-10 w-full flex-col justify-center rounded-md border border-slate-100 bg-slate-50/50 p-1.5 dark:border-slate-800 dark:bg-slate-900/50'
                  style={{
                    background:
                      'repeating-linear-gradient(-45deg, rgba(37, 99, 235, 0.08) 0px, rgba(37, 99, 235, 0.08) 6px, rgba(16, 185, 129, 0.08) 6px, rgba(16, 185, 129, 0.08) 12px)',
                  }}
                >
                  <div className='flex h-full items-center gap-2'>
                    <div
                      className='pointer-events-none absolute inset-0'
                      style={{
                        background:
                          'repeating-linear-gradient(-45deg, #2563eb 0px, #2563eb 6px, #10b981 6px, #10b981 12px)',
                        clipPath:
                          'inset(4px calc(100% - 4px - 3px) 4px 4px round 9999px)',
                      }}
                    />
                    <div className='flex min-w-0 flex-col gap-0.5 pl-3'>
                      <div className='truncate text-[10px] font-bold'>
                        Team Sync & Wellness
                      </div>
                      <div className='text-[8px] text-slate-400'>
                        10:00 - 11:30
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Month View Preview */}
              <div className='space-y-1.5'>
                <p className='text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                  Month View Preview (Team, Travel, Learning)
                </p>
                <div className='relative h-14 w-full rounded-md border border-slate-100 bg-slate-50/50 p-1 dark:border-slate-800 dark:bg-slate-900/50'>
                  <div className='grid h-full grid-cols-3 border border-slate-200/50 dark:border-slate-800/50'>
                    <div className='border-r border-slate-200/50 p-0.5 dark:border-slate-800/50'>
                      <span className='text-[8px] opacity-30'>12</span>
                    </div>
                    <div className='border-r border-slate-200/50 bg-white p-0.5 dark:border-slate-800/50 dark:bg-slate-950'>
                      <span className='text-[8px] font-bold'>13</span>
                      <div
                        className='relative mt-0.5 flex h-3 items-center overflow-hidden rounded-[2px] px-1 pl-2'
                        style={{
                          background:
                            'repeating-linear-gradient(-45deg, rgba(37, 99, 235, 0.1) 0px, rgba(37, 99, 235, 0.1) 6px, rgba(236, 72, 153, 0.1) 6px, rgba(236, 72, 153, 0.1) 12px, rgba(236, 72, 153, 0.1) 12px, rgba(20, 184, 166, 0.1) 12px, rgba(20, 184, 166, 0.1) 18px)',
                        }}
                      >
                        {/* Vertical segmented color bar */}
                        <div
                          className='absolute top-0 bottom-0 left-0.5 w-[3px] rounded'
                          style={{
                            background:
                              'linear-gradient(to bottom, #2563eb 0%, #2563eb 33.33%, #ec4899 33.33%, #ec4899 66.66%, #14b8a6 66.66%, #14b8a6 100%)',
                          }}
                        />
                        <span className='truncate text-[8px] font-medium'>
                          Company Off-site
                        </span>
                      </div>
                    </div>
                    <div className='p-0.5'>
                      <span className='text-[8px] opacity-30'>14</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
