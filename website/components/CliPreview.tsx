'use client';

// Color tokens (light / dark)
// border-pipe:  text-zinc-400 dark:text-zinc-600
// secondary:    text-zinc-500 dark:text-zinc-500
// tertiary:     text-zinc-500 dark:text-zinc-400
// body:         text-zinc-700 dark:text-zinc-300
// primary:      text-zinc-900 dark:text-white
// accent:       text-cyan-600 dark:text-cyan-400
// success:      text-green-600 dark:text-green-400

export function CliPreview() {
  return (
    <div className='my-6 overflow-hidden rounded-xl border border-zinc-300 bg-[#f3f7fe] font-mono text-sm leading-6 dark:border-zinc-700 dark:bg-[#0d0d0d]'>
      {/* Window chrome */}
      <div className='flex items-center gap-2 border-b border-zinc-300 bg-zinc-200 px-4 py-2 dark:border-zinc-700 dark:bg-[#1a1a1a]'>
        <span className='h-3 w-3 rounded-full bg-[#ff5f57]' />
        <span className='h-3 w-3 rounded-full bg-[#febc2e]' />
        <span className='h-3 w-3 rounded-full bg-[#28c840]' />
      </div>

      {/* Terminal content */}
      <div className='overflow-x-auto p-5 text-[13px] leading-[1.7]'>
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

        {/* Plugins selection */}
        <p>
          <span className='text-zinc-400 dark:text-zinc-600'>└</span>
          <span className='text-cyan-600 dark:text-cyan-400'>◆ </span>
          <span className='font-medium text-zinc-900 dark:text-white'>
            Select plugins to install
          </span>
          <span className='text-zinc-500'>
            {' '}
            (space to toggle, enter to confirm)
          </span>
        </p>
        <p>
          <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
          <span className='text-zinc-500 dark:text-zinc-400'>◼ </span>
          <span className='text-zinc-900 dark:text-white'>
            Drag &amp; Drop{' '}
          </span>
          <span className='text-zinc-500'>(@dayflow/plugin-drag)</span>
        </p>
        <p>
          <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
          <span className='text-zinc-500 dark:text-zinc-400'>◼ </span>
          <span className='text-zinc-900 dark:text-white'>
            Keyboard Shortcuts
          </span>
        </p>
        <p>
          <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
          <span className='text-zinc-500 dark:text-zinc-400'>◼ </span>
          <span className='text-zinc-900 dark:text-white'>Localization</span>
        </p>
        <p>
          <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
          <span className='text-zinc-500 dark:text-zinc-400'>◼ </span>
          <span className='text-zinc-900 dark:text-white'>Sidebar</span>
        </p>

        {/* Package manager */}
        <p>
          <span className='text-zinc-400 dark:text-zinc-600'>└</span>
          <span className='text-cyan-600 dark:text-cyan-400'>◆ </span>
          <span className='font-medium text-zinc-900 dark:text-white'>
            Which package manager do you use?
          </span>
        </p>
        <p>
          <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
          <span className='text-cyan-600 dark:text-cyan-400'>● </span>
          <span className='text-zinc-900 dark:text-white'>npm </span>
          <span className='text-zinc-500'>(detected)</span>
          <span className='text-zinc-500'> (npm install)</span>
        </p>
        <p>
          <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
          <span className='text-zinc-500'>○ pnpm</span>
        </p>
        <p>
          <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
          <span className='text-zinc-500'>○ yarn</span>
        </p>
        <p>
          <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
          <span className='text-zinc-500'>○ bun</span>
        </p>

        {/* Installation plan box */}
        <p className='mt-1'>
          <span className='text-zinc-400 dark:text-zinc-600'>└</span>
          <span className='text-zinc-700 dark:text-zinc-300'>
            Installation plan{' '}
          </span>
        </p>
        <p>
          <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
          <span className='font-medium text-zinc-900 dark:text-white'>
            Framework:{' '}
          </span>
          <span className='text-cyan-600 dark:text-cyan-400'>
            {' '}
            @dayflow/react
          </span>
        </p>
        <p>
          <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
          <span className='font-medium text-zinc-900 dark:text-white'>
            Plugins:{' '}
          </span>
          <span className='text-zinc-700 dark:text-zinc-300'>
            {' '}
            @dayflow/plugin-drag, @dayflow/plugin-keyboard-shortcuts ...
          </span>
        </p>
        <p>
          <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
          <span className='font-medium text-zinc-900 dark:text-white'>
            Command:{' '}
          </span>
          <span className='text-zinc-500 dark:text-zinc-400'>
            {' '}
            npm install @dayflow/core @dayflow/react @dayflow/plugin-drag ...
          </span>
        </p>

        {/* Confirm */}
        <p>
          <span className='text-cyan-600 dark:text-cyan-400'>◆ </span>
          <span className='font-medium text-zinc-900 dark:text-white'>
            Proceed with installation?
          </span>
        </p>
        <p>
          <span className='text-zinc-400 dark:text-zinc-600'>│ </span>
          <span className='text-cyan-600 dark:text-cyan-400'>Yes</span>
        </p>

        {/* Spinner */}
        <p>
          <span className='text-cyan-600 dark:text-cyan-400'>◇ </span>
          <span className='text-zinc-900 dark:text-white'>
            Packages installed successfully
          </span>
        </p>

        {/* Outro */}
        <p>
          <span className='text-green-600 dark:text-green-400'>✓ </span>
          <span className='text-zinc-900 dark:text-white'>
            DayFlow is ready!{' '}
          </span>
        </p>
      </div>
    </div>
  );
}
