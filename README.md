# DayFlow

**English** | [中文](README.zh.md) | [日本語](README.ja.md) | [Getting Started & Contributing](CONTRIBUTING.md)

A flexible and feature-rich calendar component library for React applications with drag-and-drop support, multiple
views, and plugin architecture.

[![npm](https://img.shields.io/npm/v/@dayflow/core?logo=npm&color=blue&label=version)](https://www.npmjs.com/package/@dayflow/core)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?logo=github)](https://github.com/dayflow-js/dayflow/pulls)
[![License](https://img.shields.io/github/license/dayflow-js/dayflow)](https://github.com/dayflow-js/dayflow/blob/main/LICENSE)
[![Discord](https://img.shields.io/badge/Discord-Join%20Chat-5865F2?logo=discord&logoColor=white)](https://discord.gg/9vdFZKJqBb)

## 🗓️ Features

### ✨ Monthly, Weekly, Daily and Various View Types

| Monthly                                  | Weekly                                 |
|------------------------------------------|----------------------------------------|
| ![image](./assets/images//MonthView.png) | ![image](./assets/images/WeekView.png) |

| Daily                                 | Event Stack Level                        |
|---------------------------------------|------------------------------------------|
| ![image](./assets/images/DayView.png) | ![image](./assets/images/stackLevel.png) |

### 🤩 Default Panel (with multiple Event Detail Panel options available)

| Detail Popup                        | Detail Dialog                        |
|-------------------------------------|--------------------------------------|
| ![image](./assets/images/popup.png) | ![image](./assets/images/dialog.png) |

## Quick Start

Official website:

https://dayflow-js.github.io/calendar/

### Installation

```tsx
npm
install
@dayflow/
core
lucide - react

```

The entire **DayFlow** app is created through the `useCalendarApp` hook, which returns a **`calendar`** object.

This object is then rendered using the `DayFlowCalendar` UI component.

```tsx
'use client';

import {
  useCalendarApp,
  DayFlowCalendar,
  createMonthView,
  createEvent,
  createAllDayEvent,
  createTimedEvent,
} from '@dayflow/core';
import '@dayflow/core/dist/styles.css';

// Local timed event (no timezone complexity)
const meeting = createEvent({
  id: '1',
  title: 'Team Meeting',
  start: new Date(2024, 9, 15, 10, 0), // Oct 15, 2024 10:00
  end: new Date(2024, 9, 15, 11, 0), // Oct 15, 2024 11:00
});

// All-day event
const holiday = createAllDayEvent(
  '2',
  'Tech Conference',
  new Date(2024, 9, 20)
);

// Quick timed event creation
const lunch = createTimedEvent(
  '3',
  'Lunch Break',
  new Date(2024, 9, 15, 12, 0), // 12:00
  new Date(2024, 9, 15, 13, 0) // 13:00
);

export default function MyCalendar() {
  const calendar = useCalendarApp({
    views: [createMonthView()],
    events: [],
    calendars: [],
    defaultView: 'month',
    initialDate: new Date(),
  });

  return <DayFlowCalendar calendar={calendar} />;
}
```

- **views**: An array of calendar views. Currently, DayFlow provides four built-in factory functions:
  `createMonthView`, `createWeekView`, `createDayView`, and `createYearView` (still in development).
  The order of views determines the order of tabs (Year / Month / Week / Day).
- **events**: The core data of the calendar. Events can be created using the built-in helpers
  `createEvent`, `createAllDayEvent`, and `createTimedEvent`, depending on the event type.

---

## `useCalendarApp` Configuration Options

| Option                 | Type                      | Default                | Description                                                                                                          | Required |
|------------------------|---------------------------|------------------------|----------------------------------------------------------------------------------------------------------------------|----------|
| `views`                | `CalendarView[]`          | —                      | Registered view definitions (e.g. `createMonthView()`). At least one view is required                                | ✅        |
| `plugins`              | `CalendarPlugin[]`        | `[]`                   | Optional plugins (drag support, keyboard shortcuts, etc.). Each plugin receives the app instance during installation | ❌        |
| `events`               | `Event[]`                 | `[]`                   | Initial event data. Use `addEvent` / `updateEvent` to modify later                                                   | ❌        |
| `callbacks`            | `CalendarCallbacks`       | `{}`                   | Lifecycle hooks triggered on view, date, or event changes — ideal for API synchronization                            | ❌        |
| `defaultView`          | `ViewType`                | `ViewType.WEEK`        | Initial view on load; must exist in `views`                                                                          | ❌        |
| `initialDate`          | `Date`                    | `new Date()`           | Initial focused date (also initializes visible range calculation)                                                    | ❌        |
| `switcherMode`         | `'buttons' | 'select'`    | `'buttons'`            | Controls how the built-in view switcher is rendered in the header                                                    | ❌        |
| `calendars`            | `CalendarType[]`          | `[]`                   | Register calendar categories (work, personal, etc.) with colors and visibility                                       | ❌        |
| `defaultCalendar`      | `string`                  | First visible calendar | Calendar ID used when creating new events                                                                            | ❌        |
| `theme`                | `ThemeConfig`             | `{ mode: 'light' }`    | Global theme mode and optional token overrides                                                                       | ❌        |
| `locale`               | `string | Locale`         | `'en-US'`              | Internationalization (i18n). Supports language codes (e.g. `'zh'`) or Locale objects                                 | ❌        |
| `useSidebar`           | `boolean | SidebarConfig` | `false`                | Enable the built-in sidebar or customize width, collapse state, and renderer                                         | ❌        |
| `useEventDetailDialog` | `boolean`                 | `false`                | Use a modal dialog for event details instead of an inline panel                                                      | ❌        |

## Callback Functions

`callbacks` act as a bridge between DayFlow and your backend or external state management.

They are commonly used for CRUD operations with databases or APIs.

Examples include:

- `onViewChange(view)`: Triggered after view switching (useful for analytics or URL sync)
- `onDateChange(date)`: Fired when the focused date changes
- `onVisibleMonthChange(date)`: Triggered when the visible month changes (useful for preloading data)
- `onEventCreate / Update / Delete`: Connect event CRUD with your backend
- `onCalendarCreate / Update / Delete`: Sync calendar list changes
- `onCalendarMerge(sourceId, targetId)`: Triggered when merging two calendars
- `onRender`: Fired after a render cycle, suitable for performance monitoring

```tsx
const calendar = useCalendarApp({
  views: [createDayView(), createWeekView(), createMonthView()],
  events,
  calendars: customCalendarTypes,
  defaultCalendar: 'work',
  plugins: [dragPlugin],
  theme: { mode: 'auto' },
  useSidebar: sidebarConfig,
  callbacks: {
    onCalendarUpdate: async calendar => {
      console.log('update calendar:', calendar);
    },
    onCalendarDelete: async calendar => {
      console.log('delete calendar:', calendar);
    },
    onCalendarCreate: async calendar => {
      // await server API call
      console.log('create calendar:', calendar);
    },
    onCalendarMerge: async (sourceId, targetId) => {
      console.log('merge calendar:', sourceId, targetId);
    },
  },
});
```

---

## Event Detail Management

DayFlow includes a default event detail panel that supports editing:

- Title
- Time range
- Notes

You can also pass a `meta` object to store custom fields such as **meeting links**, **locations**, etc.

<img width="536" height="323" alt="image" src="https://github.com/user-attachments/assets/7a599105-460e-4f83-8418-92bcd0ff8c2a" />

You can enable the detail panel as a modal dialog by passing `useEventDetailDialog` to `DayFlowCalendar`:

```tsx
<DayFlowCalendar calendar={calendar} useEventDetailDialog={true} />
```

<img width="1476" height="1108" alt="image" src="https://github.com/user-attachments/assets/c9f1e231-f8d1-4006-8ff1-942bb7491934" />

---

### Custom Event Detail Panel / Dialog

For fully customized UIs, you can replace the default detail panel or dialog by providing your own components via:

- `customDetailPanelContent`
- `customEventDetailDialog`

```tsx
<DayFlowCalendar
  calendar={calendar}
  customEventDetailDialog={CustomDialog} // Modal dialog
  customDetailPanelContent={CustomContent} // Floating panel
/>
```

See the documentation for details:

- **Custom Event Detail Dialog**
  https://dayflow-js.github.io/calendar/docs/features/custom-detail-dialog
- **Custom Event Detail Panel**
  https://dayflow-js.github.io/calendar/docs/features/custom-detail-panel

---

## Sidebar

DayFlow ships with a powerful built-in sidebar.

You can:

- Drag calendars from the sidebar to create events

  ![Area](https://github.com/user-attachments/assets/938a9a8f-b995-4ea0-8fe3-fa25ca2be4b6)

- Merge, delete, and recolor calendars

  <img width="540" height="423" alt="image" src="https://github.com/user-attachments/assets/257a8671-e645-43fe-861e-613030f6c46e" />

- Use preset colors or choose custom colors via a color picker

  <img width="872" height="708" alt="image" src="https://github.com/user-attachments/assets/bfda7cde-281e-4c23-86d6-910b13e7bc63" />

```tsx
const calendar = useCalendarApp({
  views: [createMonthView(), createWeekView(), createDayView()],
  plugins: [createDragPlugin()],
  events,
  calendars,
  defaultView: ViewType.WEEK,
  useSidebar: {
    enabled: true,
    width: 280,
  },
});
```

---

### `useSidebar` Configuration

| Property                     | Type                                                               | Description                                                                                 | Default    |
|------------------------------|--------------------------------------------------------------------|---------------------------------------------------------------------------------------------|------------|
| `enabled`                    | `boolean`                                                          | Whether the sidebar is enabled.                                                             | `true`     |
| `width`                      | `number \| string`                                                 | Width of the sidebar (e.g., `240` or `'20%'`).                                              | `'240px'`  |
| `initialCollapsed`           | `boolean`                                                          | Whether the sidebar is collapsed by default.                                                | `false`    |
| `render`                     | `(props: CalendarSidebarRenderProps) => React.ReactNode`           | Full override for the sidebar UI.                                                           | -          |
| `createCalendarMode`         | `'inline' \| 'modal'`                                              | Mode for creating new calendars: `inline` (direct edit in list) or `modal` (pop-up dialog). | `'inline'` |
| `renderCalendarContextMenu`  | `(calendar: CalendarType, onClose: () => void) => React.ReactNode` | Custom renderer for the right-click context menu on calendar items.                         | -          |
| `renderCreateCalendarDialog` | `(props: CreateCalendarDialogProps) => React.ReactNode`            | Custom renderer for the calendar creation dialog (used in `modal` mode).                    | -          |


---

### Custom Sidebar

If your project already has its own sidebar design, you can fully customize it using `useSidebar.render`.

This render function receives real-time calendar state and helper methods to interact with DayFlow core.

**`CalendarSidebarRenderProps` enables communication between your custom sidebar and DayFlow core.**

```tsx
import type { CalendarSidebarRenderProps } from '@dayflow/core';

const CustomSidebar = ({
  app,
  calendars,
  toggleCalendarVisibility,
  toggleAll,
  isCollapsed,
  setCollapsed,
}: CalendarSidebarRenderProps) => {
  if (isCollapsed) {
    return <button onClick={() => setCollapsed(false)}>Expand Sidebar</button>;
  }

  return (
    <aside className="flex h-full flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Calendars</h3>
        <div className="space-x-2">
          <button onClick={() => toggleAll(true)}>Show All</button>
          <button onClick={() => toggleAll(false)}>Hide All</button>
        </div>
      </header>
      <ul className="space-y-2">
        {calendars.map(calendar => (
          <li key={calendar.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={calendar.isVisible}
              onChange={() =>
                toggleCalendarVisibility(calendar.id, !calendar.isVisible)
              }
            />
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: calendar.colors.eventColor }}
            />
            {calendar.name}
          </li>
        ))}
      </ul>
      <section className="rounded-xl border border-slate-200 p-3 text-xs">
        <p>Current date: {app.getCurrentDate().toDateString()}</p>
        <p>Total events: {app.getEvents().length}</p>
      </section>
    </aside>
  );
};

const calendar = useCalendarApp({
  /* ... */
  useSidebar: {
    enabled: true,
    width: 320,
    render: props => <CustomSidebar {...props} />,
  },
});
```

---

## Dark Mode

DayFlow Calendar natively supports full dark mode across views, sidebar, event cards, and dialogs.

<img width="1103" height="729" alt="image" src="https://github.com/user-attachments/assets/03c542d4-4b1b-4b99-9590-08c7be7f85df" />

You can switch between **light**, **dark**, or **auto** (follows system preference).

```tsx
import { DayFlowCalendar, useCalendarApp } from '@dayflow/core';

function MyCalendar() {
  const calendar = useCalendarApp({
    theme: {
      mode: 'dark', // 'light' | 'dark' | 'auto'
    },
  });

  return <DayFlowCalendar calendar={calendar} />;
}
```

---

## View Switcher Modes

The `switcherMode` option controls how the view switcher in the header is rendered.

DayFlow provides two built-in modes:

- **`buttons`**: Horizontal button tabs (default, ideal for desktop)

<img width="2190" height="406" alt="image" src="https://github.com/user-attachments/assets/a4be37bc-90ac-4872-afa0-589e3d1f7e9b" />

- **`select`**: Dropdown menu (space-saving, mobile-friendly)

<img width="2186" height="420" alt="image" src="https://github.com/user-attachments/assets/28e321ae-6c56-441a-a9fc-ddcfa504c920" />

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Bug Reports

If you find a bug, please file an issue on [GitHub Issues](https://github.com/dayflow-js/dayflow/issues).

## Support

For questions and support, please open an issue on GitHub or go to discord.

---
