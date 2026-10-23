# DayFlow Core

The core engine of DayFlow, a flexible and feature-rich calendar library with drag-and-drop support, multiple views, and plugin architecture.

[![npm](https://img.shields.io/npm/v/@dayflow/core?logo=npm&color=blue&label=version)](https://www.npmjs.com/package/@dayflow/core)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?logo=github)](https://github.com/dayflow-js/dayflow/pulls)
[![License](https://img.shields.io/github/license/dayflow-js/dayflow)](https://github.com/dayflow-js/dayflow/blob/main/LICENSE)
[![Discord](https://img.shields.io/badge/Discord-Join%20Chat-5865F2?logo=discord&logoColor=white)](https://discord.gg/9vdFZKJqBb)

## Features

### Daily, Weekly, Monthly and Yearly View Types

#### Day View

![Day View](https://raw.githubusercontent.com/dayflow-js/dayflow/main/assets/images/DayView.png)

#### Week View

![Week View](https://raw.githubusercontent.com/dayflow-js/dayflow/main/assets/images/WeekView.png)

#### Month View

![Month View](https://raw.githubusercontent.com/dayflow-js/dayflow/main/assets/images/MonthView.png)

#### Year View(Fixed-Week)

![Year View](https://raw.githubusercontent.com/dayflow-js/dayflow/main/assets/images/Year-Fixed-Week.png)

#### Year View(Year-Canvas)

![Year Canvas View](https://raw.githubusercontent.com/dayflow-js/dayflow/main/assets/images/Year-Canvas.png)

### Mobile View Support

#### Mobile Day & Year View

![Mobile Day and Year View](https://raw.githubusercontent.com/dayflow-js/dayflow/main/assets/images/Mobile-Day-Year.png)

#### Mobile Week & Month View

![Mobile Week and Month View](https://raw.githubusercontent.com/dayflow-js/dayflow/main/assets/images/Mobile-Week-Month.png)

### Multiple Event Detail Panel options

#### Detail Popup

![Popup](https://raw.githubusercontent.com/dayflow-js/dayflow/main/assets/images/popup.png)

#### Detail Dialog

![Dialog](https://raw.githubusercontent.com/dayflow-js/dayflow/main/assets/images/dialog.png)

### Dark Mode Support

![Dark Mode](https://raw.githubusercontent.com/dayflow-js/dayflow/main/assets/images/DarkMode.png)

### Easy to resize and drag

https://github.com/user-attachments/assets/726a5232-35a8-4fe3-8e7b-4de07c455353

https://github.com/user-attachments/assets/957317e5-02d8-4419-a74b-62b7d191e347

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Bug Reports

If you find a bug, please file an issue on [GitHub Issues](https://github.com/dayflow-js/dayflow/issues).

## Support

For questions and support, please open an issue on GitHub or go to discord.

### Optional tasks

Set `enableTasks: true` in your calendar configuration to show the Event / Task
switch in the built-in desktop and mobile editors. It defaults to `false` to
preserve the existing event creation interface. This option can also be changed
with `app.updateConfig({ enableTasks: true })`. Existing task data remains visible
and editable when the option is off.

Tasks use `kind: 'task'`, a single due date/time (`start` and `end` are equal),
and optional `task: { completed, completedAt, priority }` metadata. Priority is
`'none'`, `'low'`, `'medium'`, or `'high'`; the calendar uses a striped background for tasks: low is green, medium is amber, high is red,
and no priority is slate. Priority does not change chronological calendar ordering.
Use `allDay: true` and `Temporal.PlainDate` values for a date-only task.

### Checking bundle size (repository development)

After building, run `pnpm --filter @dayflow/core size` for raw/gzip/Brotli asset
sizes, and `pnpm --filter @dayflow/core check:tree-shaking` for consumer import
probes and the utility-import size budget. Import only the view factories you use;
`enableTasks` controls the editor interface at runtime, rather than removing task
code from the package.
