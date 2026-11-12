import { ChevronDown } from 'lucide-react';

const CALENDAR_GROUPS = [
  {
    name: 'Google',
    calendars: [
      { name: 'Team', color: 'bg-blue-500' },
      { name: 'Personal', color: 'bg-emerald-500' },
    ],
  },
  {
    name: 'iCloud',
    calendars: [{ name: 'Family', color: 'bg-orange-500' }],
  },
];

export function CalendarGroupsPreview() {
  return (
    <div className='space-y-1.5'>
      <p className='text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
        Sidebar Preview
      </p>
      <div className='overflow-hidden rounded-md border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950'>
        {CALENDAR_GROUPS.map((group, groupIndex) => (
          <div
            key={group.name}
            className={
              groupIndex > 0
                ? 'border-t border-slate-100 dark:border-slate-800'
                : undefined
            }
          >
            <div className='flex h-7 items-center justify-between bg-slate-50 px-2 dark:bg-slate-900'>
              <span className='text-[11px] font-semibold text-slate-700 dark:text-slate-200'>
                {group.name}
              </span>
              <ChevronDown className='h-3 w-3 text-slate-400' />
            </div>
            <div className='space-y-1 px-2 py-1.5'>
              {group.calendars.map(calendar => (
                <div
                  key={calendar.name}
                  className='flex h-5 items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300'
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-[3px] ${calendar.color}`}
                  />
                  <span>{calendar.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SecondaryTimeZonePreview() {
  const rows = [
    ['08:00', '16:00'],
    ['09:00', '17:00'],
    ['10:00', '18:00'],
  ];

  return (
    <div className='space-y-1.5'>
      <p className='text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
        Time Axis Preview
      </p>
      <div className='overflow-hidden rounded-md border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950'>
        <div className='grid h-7 grid-cols-2 items-center bg-slate-50 text-center dark:bg-slate-900'>
          <span className='text-[10px] font-bold text-slate-500 dark:text-slate-400'>
            GMT+2
          </span>
          <span className='border-l border-slate-200 text-[10px] font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400'>
            GMT+10
          </span>
        </div>
        {rows.map(([secondary, primary]) => (
          <div
            key={secondary}
            className='grid h-7 grid-cols-2 items-center border-t border-slate-100 text-center dark:border-slate-800'
          >
            <span className='text-[11px] text-slate-500 dark:text-slate-400'>
              {secondary}
            </span>
            <span className='border-l border-slate-100 text-[11px] font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200'>
              {primary}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SHORTCUTS = [
  { label: 'Search', key: '⌘F' },
  { label: 'Today', key: '⌘T' },
  { label: 'New Event', key: '⌘N' },
  { label: 'Undo', key: '⌘Z' },
  { label: 'Redo', key: '⌘⇧Z / ⌘Y' },
  { label: 'Event Switch', key: 'Tab / ⇧Tab' },
  { label: 'Prev/Next', key: '← / →' },
  { label: 'Copy Event', key: '⌘C' },
  { label: 'Paste Event', key: '⌘V' },
  { label: 'Cut Event', key: '⌘X' },
  { label: 'Delete', key: '⌫' },
];

export function KeyboardShortcutsPreview() {
  return (
    <div className='space-y-2'>
      <ul className='space-y-1.5 text-xs'>
        {SHORTCUTS.map(shortcut => (
          <li key={shortcut.label} className='flex justify-between gap-4'>
            <span>{shortcut.label}</span>{' '}
            <kbd className='font-sans opacity-70'>{shortcut.key}</kbd>
          </li>
        ))}
      </ul>
      <div className='border-t border-slate-100 pt-1.5 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500'>
        Windows / Linux Using Ctrl
      </div>
    </div>
  );
}
