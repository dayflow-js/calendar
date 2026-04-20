'use client';

import { useState, useEffect } from 'react';

// Color tokens (light / dark)
// border-pipe:  text-zinc-400 dark:text-zinc-600
// secondary:    text-zinc-500 dark:text-zinc-500
// tertiary:     text-zinc-500 dark:text-zinc-400
// body:         text-zinc-700 dark:text-zinc-300
// primary:      text-zinc-900 dark:text-white
// accent:       text-cyan-600 dark:text-cyan-400
// success:      text-green-600 dark:text-green-400

export function CliPreview() {
  const [command, setCommand] = useState('');
  const [showContent, setShowContent] = useState(false);
  const fullCommand = 'npm create dayflow@latest';

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (command.length < fullCommand.length) {
      timeout = setTimeout(() => {
        setCommand(fullCommand.slice(0, command.length + 1));
      }, 60);
    } else {
      timeout = setTimeout(() => {
        setShowContent(true);
      }, 600);
    }
    return () => clearTimeout(timeout);
  }, [command]);

  return (
    <div className='my-6 overflow-hidden rounded-xl border border-zinc-300 bg-[#f3f7fe] font-mono text-sm leading-6 dark:border-zinc-700 dark:bg-[#0d0d0d]'>
      {/* Window chrome */}
      <div className='text-fd-muted-foreground flex flex-row items-center gap-2 border-b p-2'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='24'
          height='24'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          className='lucide lucide-terminal size-4'
          aria-hidden='true'
        >
          <path d='M12 19h8'></path>
          <path d='m4 17 6-6-6-6'></path>
        </svg>
        <span className='text-xs font-medium'>Terminal</span>
        <div className='ms-auto me-2 size-2 rounded-full bg-red-400'></div>
      </div>

      {/* Terminal content */}
      <div className='overflow-x-auto p-5 text-[13px] leading-[1.7]'>
        <div className='mb-4 flex gap-2'>
          <span className='text-cyan-600 dark:text-cyan-400'>~</span>
          <span className='text-zinc-900 dark:text-white'>
            {command}
            {!showContent && (
              <span className='ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-zinc-500 align-middle' />
            )}
          </span>
        </div>

        {showContent && (
          <div className='animate-in fade-in slide-in-from-top-1 duration-500'>
            {/* Intro */}
            <p>
              <span className='text-zinc-400 dark:text-zinc-600'>┌ </span>
              <span className='rounded bg-cyan-500 px-1.5 py-0.5 font-semibold text-black'>
                DayFlow
              </span>
              <span className='text-zinc-500'> — Calendar component setup</span>
            </p>
            {/* Framework selection */}
            <p>
              <span className='text-cyan-600 dark:text-cyan-400'>◆ </span>
              <span className='font-medium text-zinc-900 dark:text-white'>
                Which framework are you using?
              </span>
            </p>
            <p>
              <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
              <span className='text-cyan-600 dark:text-cyan-400'>● </span>
              <span className='text-zinc-900 dark:text-white'>React </span>
              <span className='text-zinc-500'>(@dayflow/react)</span>
            </p>
            <p>
              <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
              <span className='text-zinc-500'>○ Vue</span>
            </p>
            <p>
              <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
              <span className='text-zinc-500'>○ Svelte</span>
            </p>
            <p>
              <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
              <span className='text-zinc-500'>○ Angular</span>
            </p>

            <p>
              <span className='text-zinc-900 dark:text-white'>...</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
