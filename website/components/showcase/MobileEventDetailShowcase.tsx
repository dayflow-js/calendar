'use client';

import { BASE_PATH } from '@/lib/site';

const demoSrc = `${BASE_PATH}/showcase/mobile-event-detail`;

export const MobileEventDetailShowcase = () => (
  <div className='overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_42%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_100%)] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.18),_transparent_38%),linear-gradient(180deg,_rgba(15,23,42,0.96)_0%,_rgba(2,6,23,1)_100%)]'>
    <div className='mx-auto w-full max-w-[390px] rounded-[2.4rem] bg-slate-950 p-2.5 shadow-[0_24px_80px_rgba(15,23,42,0.45)] ring-1 ring-white/10'>
      <div className='mb-2 flex items-center justify-center'>
        <div className='h-6 w-32 rounded-full bg-slate-800' />
      </div>

      <div className='overflow-hidden rounded-[1.9rem] bg-white ring-1 ring-slate-200/70 dark:bg-slate-950 dark:ring-slate-700/80'>
        <iframe
          title='Mobile Event Detail Simulator'
          src={demoSrc}
          className='block h-[720px] w-full border-0 bg-white'
          sandbox='allow-scripts'
        />
      </div>
    </div>

    <p className='mt-4 text-center text-xs text-slate-600 dark:text-slate-400'>
      Tap an event to open the mobile drawer. This showcase runs in an iframe so
      DayFlow reads a real mobile viewport instead of the desktop window.
    </p>
  </div>
);

export default MobileEventDetailShowcase;
