'use client';

import { Check, CircleHelp } from 'lucide-react';
import { useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { CalendarFeatures } from './types';

import styles from './TaskFeature.module.css';

/** Animated illustration: completion first, then priority changes in the panel. */
function TaskPreview() {
  return (
    <div className={styles.preview} aria-hidden='true'>
      <div className='mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
        Task preview
      </div>
      <div
        className={`${styles.task} flex items-center gap-2 rounded-md border border-slate-200 p-2 dark:border-slate-700`}
      >
        <span className={styles.circle}>
          <Check size={10} className={styles.check} />
        </span>
        <span className={`${styles.title} text-xs`}>Send launch checklist</span>
      </div>
      <div
        className={`${styles.panel} mt-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950`}
      >
        <div className='mb-3 flex rounded-md bg-slate-100 p-0.5 text-center text-[10px] dark:bg-slate-800'>
          <span className='flex-1 py-1 text-slate-400'>Event</span>
          <span className='flex-1 rounded bg-white py-1 font-semibold shadow-sm dark:bg-slate-700'>
            Task
          </span>
        </div>
        <p className='mb-1 text-[10px] text-slate-500'>Task Title</p>
        <div className='mb-3 rounded border border-slate-100 px-2 py-1.5 text-xs dark:border-slate-800'>
          Send launch checklist
        </div>
        <p className='mb-1 text-[10px] text-slate-500'>Priority</p>
        <div className='flex items-center gap-2 rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700'>
          <span className={`${styles.priority} relative flex-1`}>
            <span className={styles.low}>Low</span>
            <span className={styles.medium}>Medium</span>
            <span className={styles.high}>High</span>
          </span>
          <span className='text-slate-400'>⌄</span>
        </div>
      </div>
      <p className='mt-2 text-[10px] text-slate-400'>
        Completion → Details → Priority
      </p>
    </div>
  );
}

export function TaskFeature({
  checked,
  onUpdateFeatures,
}: {
  checked: boolean;
  onUpdateFeatures: (updates: Partial<CalendarFeatures>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className='flex items-center gap-2'>
      <Checkbox
        id='enable-tasks'
        checked={checked}
        onCheckedChange={value =>
          onUpdateFeatures({ enableTasks: value === true })
        }
        className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
      />
      <Label
        htmlFor='enable-tasks'
        className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
      >
        Tasks
      </Label>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type='button'
            aria-label='Preview tasks'
            onClick={() => setOpen(value => !value)}
            className='inline-flex items-center gap-1 rounded text-[10px] text-slate-500 outline-offset-2 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          >
            <CircleHelp className='h-3 w-3' /> Preview
          </button>
        </TooltipTrigger>
        <TooltipContent side='bottom' className='w-72 space-y-3 p-3'>
          <p className='text-xs leading-relaxed'>
            Click the circle on the left to complete a task. Open the task to
            change its priority in the detail panel.
          </p>
          <TaskPreview />
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
