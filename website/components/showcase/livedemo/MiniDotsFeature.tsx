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

interface MiniDotsFeatureProps {
  checked: boolean;
  onUpdateFeatures: (updates: Partial<CalendarFeatures>) => void;
}

export function MiniDotsFeature({
  checked,
  onUpdateFeatures,
}: MiniDotsFeatureProps) {
  return (
    <div className='flex items-center space-x-2'>
      <Checkbox
        id='event-dots'
        checked={checked}
        onCheckedChange={newChecked =>
          onUpdateFeatures({ showEventDots: newChecked === true })
        }
        className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
      />
      <div className='flex items-center gap-1'>
        <Label
          htmlFor='event-dots'
          className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
        >
          Mini Dots
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
              <p className='mb-1 text-sm font-semibold'>Mini Calendar Dots</p>
              <p className='text-[11px] leading-relaxed text-slate-500 dark:text-slate-400'>
                Shows colored dots below dates in the sidebar mini calendar.
                Each dot represents a unique calendar color with events on that
                day.
              </p>
            </div>
            <div className='bg-white p-3 dark:bg-slate-950'>
              <div className='space-y-1.5'>
                <p className='text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                  Mini Calendar Preview
                </p>
                <div className='relative h-14 w-full rounded-md border border-slate-100 bg-slate-50/50 p-1 dark:border-slate-800 dark:bg-slate-900/50'>
                  <div className='grid h-full grid-cols-4 border border-slate-200/50 dark:border-slate-800/50'>
                    {/* Day 1 */}
                    <div className='relative flex flex-col items-center border-r border-slate-200/50 p-1 dark:border-slate-800/50'>
                      <span className='text-[10px] font-medium opacity-60'>
                        14
                      </span>
                      <div className='mt-0.5 flex gap-0.5'>
                        <div className='h-1 w-1 rounded-full bg-blue-500' />
                      </div>
                    </div>
                    {/* Day 2 (Today) */}
                    <div className='relative flex flex-col items-center border-r border-slate-200/50 bg-white p-1 dark:border-slate-800/50 dark:bg-slate-950'>
                      <span className='flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white'>
                        15
                      </span>
                      <div className='mt-0.5 flex gap-0.5'>
                        <div className='h-1 w-1 rounded-full bg-blue-500' />
                        <div className='h-1 w-1 rounded-full bg-emerald-500' />
                        <div className='h-1 w-1 rounded-full bg-rose-500' />
                      </div>
                    </div>
                    {/* Day 3 */}
                    <div className='relative flex flex-col items-center border-r border-slate-200/50 p-1 dark:border-slate-800/50'>
                      <span className='text-[10px] font-medium opacity-60'>
                        16
                      </span>
                      <div className='mt-0.5 flex gap-0.5'>
                        <div className='h-1 w-1 rounded-full bg-amber-500' />
                        <div className='h-1 w-1 rounded-full bg-purple-500' />
                      </div>
                    </div>
                    {/* Day 4 */}
                    <div className='relative flex flex-col items-center p-1'>
                      <span className='text-[10px] font-medium opacity-60'>
                        17
                      </span>
                      <div className='mt-0.5 flex gap-0.5'></div>
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
