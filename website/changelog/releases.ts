/**
 * Headline content for feature releases on /changelog.
 *
 * Release notes always come from the repository CHANGELOG.md. A release only
 * needs an entry here to get a title, summary and screenshots; releases with
 * only fixes, performance work or polish are listed compactly with tags.
 *
 * `images` are names from changelog/shots.json, captured from the website demo
 * with `npm run changelog:capture <name>`. The first image is the hero.
 */
export interface ReleaseMeta {
  title: string;
  summary: string;
  images?: string[];
  links?: { label: string; href: string }[];
}

export const releaseMeta: Record<string, ReleaseMeta> = {
  '3.7.6': {
    title: 'Tasks, right in your calendar',
    summary:
      'Add tasks next to events, set a due time and priority, and check them off with one click.',
    images: ['tasks', 'tasks-priority'],
    links: [
      { label: 'Try it in the demo', href: '/demo?view=day&enableTasks=1' },
      { label: 'Task guide', href: '/docs/features/tasks' },
    ],
  },
  '3.7.5': {
    title: 'Jalali calendar and accessibility',
    summary:
      'Show every view in the Persian solar calendar, with keyboard and screen reader improvements throughout.',
  },
  '3.7.4': {
    title: 'Rich notes and detected meeting links',
    summary:
      'Notes render as formatted text, and meeting links inside them turn into a Join button.',
    images: ['rich-notes'],
  },
  '3.7.3': {
    title: 'Calendar pickers grouped by source',
    summary:
      'Every calendar picker groups calendars under their source, and context menus follow your theme.',
    images: ['calendar-picker-groups'],
  },
  '3.7.2': {
    title: 'Video meetings on events',
    summary:
      'Google Meet, Zoom, Teams and more, with a one-click Join button and synced meeting data.',
    images: ['meeting-links'],
  },
  '3.7.1': {
    title: 'Recurrence editor',
    summary: 'Build repeating events with a custom repeat dialog.',
    images: ['recurrence'],
  },
  '3.7.0': {
    title: 'Appointment schedules',
    summary:
      'Publish bookable availability, plus new time-grid extension points for plugins.',
    images: ['appointments'],
  },
  '3.6.3': {
    title: 'Calendar sync and source groups',
    summary:
      'CalDAV, Google and Outlook sync, with calendars grouped by source in the sidebar.',
    images: ['calendar-sources'],
  },
  '3.6.2': {
    title: 'Programmatic sidebar and shortcut controls',
    summary:
      'Collapse the sidebar or pause keyboard shortcuts from your own code.',
  },
  '3.6.1': {
    title: 'Configurable Month event height',
    summary: 'Set eventHeight for Month view, plus steadier drag interactions.',
  },
  '3.6.0': {
    title: 'Agenda view',
    summary: 'A scrollable list of upcoming events, grouped by day.',
    images: ['agenda-view'],
  },
  '3.5.0': {
    title: 'Events in multiple calendars',
    summary:
      'One event can belong to several calendars and shows their colors as stripes.',
    images: ['multi-calendar'],
  },
  '3.4.0': {
    title: 'Calendar time zone',
    summary:
      'One time zone for every view, plus a secondary timeline in Day and Week view.',
    images: ['time-zones'],
  },
  '3.3.0': {
    title: 'Grid Year view and create-dayflow',
    summary:
      'A compact year heatmap, and a CLI that scaffolds a project in your framework.',
    images: ['year-grid'],
  },
  '3.2.0': {
    title: 'Time formats and drag callbacks',
    summary:
      'Secondary time-zone labels, 12/24-hour formats and new onEventDrop and onEventResize callbacks.',
  },
  '3.1.0': {
    title: 'Plugin architecture',
    summary:
      'Drag and drop, keyboard shortcuts, localization and the sidebar become optional plugins.',
  },
  '3.0.0': {
    title: 'One calendar for every framework',
    summary: 'A new core with adapters for React, Vue, Svelte and Angular.',
    images: ['month-view'],
  },
};
