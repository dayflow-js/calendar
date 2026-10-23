# Changelog

All notable changes to this project will be documented in this file.

## [3.7.6] - 2026-10-23

Released in this version: `@dayflow/core`, `@dayflow/react`, `@dayflow/vue`, `@dayflow/svelte` and `@dayflow/angular` 3.7.6 · `@dayflow/plugin-localization` 1.6.4 · `@dayflow/ui-context-menu` 1.2.2 · `@dayflow/ui-range-picker` 1.2.2. All other packages are unchanged.

### New Features & Enhancements

- **Tasks (`@dayflow/core`)**: Add items with `kind: 'task'` and a single due date or time. Click the circle to complete a task; priorities show as colored stripes. Set `enableTasks: true` to add the Event / Task switch to the built-in editors (off by default). `setTaskCompleted` and `setTaskPriority` update tasks from code.
- **Single-Date Picker (`@dayflow/ui-range-picker`)**: `mode: 'single'` picks one date or time.
- **Task Labels (`@dayflow/plugin-localization`)**: Task and priority labels for every bundled language.

### Fixed

- **Mobile Event Drawer (`@dayflow/core`)**: Saving no longer shifts the event time when the device and calendar time zones differ.

### Performance

- **Tree Shaking (`@dayflow/core`, `@dayflow/ui-context-menu`, `@dayflow/ui-range-picker`)**: Bundlers can now drop unused components, and the Preact JSX runtime is shared instead of bundled. A Month-only calendar is about 4% smaller.

### Changed

- `@dayflow/ui-context-menu` and `@dayflow/ui-range-picker` now require `preact` 10.5 or later.

### Documentation

- Task guide in all documentation languages.

## [3.7.5] - 2026-10-17

Released in this version: `@dayflow/core`, `@dayflow/react`, `@dayflow/vue`, `@dayflow/svelte` and `@dayflow/angular` 3.7.5 · `@dayflow/plugin-localization` 1.6.3 · `@dayflow/plugin-sidebar` 1.6.5 · `@dayflow/ui-range-picker` 1.2.1. All other packages are unchanged.

### New Features & Enhancements

- **Jalali Calendar (`@dayflow/core`, `@dayflow/ui-range-picker`)**: New `calendarSystem: 'gregorian' | 'jalali'` option displays and navigates every view, the mini calendar and the range picker in the Persian solar calendar. Event data, callbacks, ICS and recurrence rules keep their ISO dates. Gregorian remains the default and keeps the existing locale behavior.
- **Persian Locale (`@dayflow/plugin-localization`)**: Added `fa` (`fa-IR`).
- **Accessibility (`@dayflow/core`, `@dayflow/plugin-sidebar`, `@dayflow/ui-range-picker`)**:
  - Navigation arrows, search controls and other icon-only buttons have translated accessible names, with new locale keys such as `previousDay`/`nextWeek`/`previousPeriod`, `clearSearch` and `close`. The arrows now name the unit they move by in each view.
  - Dialogs have dialog semantics, close on Escape, trap focus and restore it when closed. `useDialogFocus` is exported for custom dialogs.
  - The calendar picker, the sidebar's merge and import dropdowns, Year view grid days and the compact week header dates are keyboard-operable.
  - The range picker reads its labels (navigation, inputs, hour/minute, OK) from `locale.messages`.
- **Event Notes (`@dayflow/core`)**: Click a note to edit it in place; links in the note still open. The event detail panel has a fixed width, stays inside the viewport while the notes field grows, and the meeting row no longer shifts when editing.

### Fixed

- **Month View Scrolling (`@dayflow/core`)**: Scrolling no longer rebuilds the loaded weeks on every frame, so the scrolling month view stays smooth (especially in Jalali mode).
- **Locale Packs (`@dayflow/plugin-localization`)**: All packs now cover the same keys. Labels that were missing in some languages (such as "days"/"weeks" and the "already subscribed" message) no longer fall back to English.

## [3.7.4] - 2026-10-14

Released in this version: `@dayflow/core`, `@dayflow/react`, `@dayflow/vue`, `@dayflow/svelte` and `@dayflow/angular` 3.7.4 · `@dayflow/plugin-sidebar` 1.6.4. All other packages are unchanged.

### New Features & Enhancements

- **Rich Event Notes (`@dayflow/core`)**: Notes in the default event detail panel and dialog now show as formatted text with clickable links, including HTML notes from providers such as Outlook. An edit button switches to a plain-text editor; saving an edited HTML note stores it as plain text.
- **Meeting Links Detected in Notes (`@dayflow/core`)**: Events without a `conference` now show the "Join" button when their notes contain a Google Meet, Zoom, Teams, Webex, Whereby or Jitsi link. This also applies to ICS imports, and is available as `extractConferenceFromDescription`.

### Fixed

- **Month View (`@dayflow/core`)**: Clicking a day from the previous or next month now selects it, and selecting a date that is already visible no longer scrolls the view.
- **Event Detail Panel (`@dayflow/core`)**: The panel stays inside the viewport when its content is tall.
- **Sidebar with No Calendars (`@dayflow/plugin-sidebar`)**: The mini calendar keeps its position when the calendar list is empty.

## [3.7.3] - 2026-09-19

Released in this version: `@dayflow/core`, `@dayflow/react`, `@dayflow/vue`, `@dayflow/svelte` and `@dayflow/angular` 3.7.3 · `@dayflow/plugin-drag` 1.6.2 · `@dayflow/plugin-sidebar` 1.6.3 · `@dayflow/ui-context-menu` 1.2.1 · `@dayflow/sync-core` 1.1.2. All other packages are unchanged.

### New Features & Enhancements

- **Grouped Calendar Selectors (`@dayflow/core`, `@dayflow/plugin-sidebar`)**:
  - Calendar pickers in the event detail panel, detail dialog and mobile drawer, the event context menu, and the sidebar's import and delete-calendar dialogs now group calendars under headers by their `source` (for example "Google Calendar" or "iCloud").
  - Calendars without a `source` are listed ungrouped, and the lists look the same as before when no calendar has one. The sidebar's dialogs list groups in the sidebar's own group order.
- **Theme-Aware Context Menus (`@dayflow/core`, `@dayflow/ui-context-menu`)**:
  - Context menus take their colors from the calendar theme tokens (`--df-color-*`, with `--df-color-card` for the surface) instead of a built-in palette, so custom theme colors now apply to them.
  - `ContextMenu` accepts a `style` prop, merged with its computed position.
  - Used on its own, the menu falls back to the light palette. Its built-in dark palette has been removed, so define the `--df-color-*` tokens to style it for dark mode.

### Fixed

- **Event Detail Panel for Multi-Day Events (`@dayflow/core`)**: In Month view the panel now anchors to the day that was clicked rather than the whole multi-day segment, so events in the last column (for example Sunday) open the panel to the left instead of past the edge of the calendar.
- **Plugins No Longer Require Preact in Your App (`@dayflow/plugin-drag`, `@dayflow/plugin-sidebar`)**: Since 3.7.1 these plugins declared `preact`, `temporal-polyfill` and `@dayflow/blossom-color-picker` as peer dependencies. Yarn then reported that the app "doesn't provide preact", and Yarn PnP refused to resolve them, so apps had to install Preact themselves. They are regular dependencies again and share the single copy `@dayflow/core` uses. If you added `preact` to your own `package.json` for this, you can remove it.
- **Missing Types for Context Menu and Range Picker Exports (`@dayflow/core`)**: 3.7.1 and 3.7.2 re-exported `ContextMenu`, `ContextMenuItem`, `DayflowRangePicker`, `RangePickerProps`, `ZonedRange` and related types from packages that were no longer installed with core. TypeScript reported "Cannot find module", or, with `skipLibCheck` enabled, silently typed them as `any`. Those packages are core dependencies again.
- **Sync Result Types (`@dayflow/sync-core`)**: The `changes` field returned by `reconcileProviderCalendars` and `reconcileProviderEvents` referenced an internal path alias that consumers cannot resolve, so it was typed as `any` or failed with "Cannot find module". The types are now bundled correctly. This affected every release since 1.0.2.
- **React and Vue Adapter Types with `node16` / `nodenext` Resolution (`@dayflow/react`, `@dayflow/vue`)**: Under `moduleResolution: "node16"` or `"nodenext"`, TypeScript could not find `DayFlowCalendar` or `useCalendarApp`. The declarations are now bundled into a single file. `bundler` resolution was not affected.
- **Loading `@dayflow/core` in Node (`@dayflow/core`)**: The package now declares `"type": "module"`, so Node loads it as ES modules directly. Node versions without ESM syntax detection — Node 18, 20 before 20.19, and 22 before 22.7 — previously failed to load it, which affected server-side rendering and test runners.

## [3.7.2] - 2026-09-16

### New Features & Enhancements

- **Video Conference Integration (`@dayflow/core`)**:
  - Added native video conference support on calendar events via `event.conference` (`EventConference`), supporting Google Meet, Zoom, Microsoft Teams, Webex, Whereby, Jitsi, and custom meeting URLs.
  - Added utility functions (`createEventConference`, `detectMeetingProvider`, `extractMeetingId`, `normalizeMeetingUrl`, `getEventConference`, `setEventConference`) for provider auto-detection, URL normalization, meeting ID extraction, and backwards compatibility with legacy `meta.meetingUrl`.
  - Added `EventConferenceField` in the default event detail dialog and panel, featuring platform icons, a quick "Join" button, and 1-click meeting link copying with status feedback.
  - Added full localization keys for conference labels and actions.
- **Sidebar Group Management & Reordering (`@dayflow/plugin-sidebar`)**:
  - Added sidebar and group context-menu actions for creating, renaming, and deleting calendar groups.
  - Added the ability to create calendars directly inside a specific group.
  - Added drag-and-drop group reordering, persisting ordering through `groups`, and the asynchronous `onGroupReorder(groups)` callback.
- **Calendar Sync Video Meeting Support (`@dayflow/google-sync` & `@dayflow/outlook-sync`)**:
  - `@dayflow/google-sync`: Maps Google Calendar `conferenceData` (Google Meet entries, meeting codes, passcodes) and `hangoutLink` into DayFlow `event.conference`.
  - `@dayflow/outlook-sync`: Queries online meeting metadata from Microsoft Graph (`isOnlineMeeting`, `onlineMeetingProvider`, `onlineMeeting`, `onlineMeetingUrl`) and maps Teams/Skype meetings into `event.conference`.
- **Half-Hour Grid Lines (`@dayflow/core`)**:
  - Added `showHalfHourLines` configuration option to `DayViewConfig` and `WeekViewConfig` (`createDayView`, `createWeekView`) to display dashed divider lines at every half-hour interval.

### Performance

- **AgendaView Rendering Optimizations (`@dayflow/core`)**:
  - Added WeakMap-based per-event range caching (`agendaRangeCache`) and coarse year/month pre-filtering to prevent redundant date calculations and accelerate rendering on large event collections.
  - Added event click and detail panel interaction support in `AgendaView`, with intelligent panel positioning and viewport boundary clamping.

### Fixed

- **Time Axis Boundary Labels (`@dayflow/core`)**:
  - Fixed Day and Week view midnight and last-hour label calculation (`LAST_HOUR % 24`) to ensure consistent time-axis rendering across 12-hour and 24-hour formats.
  - Aligned secondary timezone labels in Day view with the primary time-axis.

## [3.7.1] - 2026-08-28

### New Features & Enhancements

- **Event Recurrence Editor**: Added a recurrence editor with a custom repeat dialog for building RRULE-backed repeating events, including multi-language translations.

### Fixed

- Fixed `@dayflow/plugin-drag` and `@dayflow/plugin-sidebar` failing to resolve `preact`, `temporal-polyfill` and `@dayflow/blossom-color-picker` at runtime. These were imported by the published bundles but never declared, so installs resolved them only by hoisting and failed outright under pnpm's strict layout.
- Fixed `@dayflow/caldav` bundling its own copy of `temporal-polyfill`. Temporal values it produced did not match the instance used by `@dayflow/core`; the polyfill is now external and shared. The package tarball also drops from 184 KB to 83 KB.

### Changed

- Internal `@dayflow/*` dependencies now publish as caret ranges (`^3.7.1`) instead of exact pins. Upgrading `@dayflow/core` no longer forces a matching upgrade of every adapter and plugin in the same install.
- `@dayflow/core` no longer declares `@dayflow/ui-context-menu` and `@dayflow/ui-range-picker` as runtime dependencies. Both were already inlined into its bundle, so consumers were downloading a second copy that was never loaded.

## [3.7.0] - 2026-08-13

### New Features & Enhancements

- **Appointment Schedule Plugin**: Introduced the `@dayflow-pro/appointment-schedule` plugin for booking availability management and schedule windows. Includes comprehensive multi-language documentation (EN/ZH/JA) and interactive video demos.
- **Time Grid Background Layer APIs**: Added time grid background layer slots and extension APIs (`time-grid background` & `quick-create`), allowing plugins to inject background availability layers, interactive deletion actions, and custom grid UI with accessibility support.
- **Native `MouseEvent` in Event Callbacks**: Passed the native triggering `MouseEvent` to event callbacks (`onEventClick`, `onEventContextMenu`, etc.) and context menu slots for precise mouse coordinate and modifier key access.
- **Scheduling i18n**: Added multi-language translation support for scheduling labels, appointment statuses, and time slot indicators.

## [3.6.8] - 2026-08-10

### Fixed

- Fixed multi-day timed event labels so fractional segment hours are rendered with the correct hour and minute values.

## [3.6.7] - 2026-08-04

### Enhancements

- Refined 12-hour time-axis labels and made time ranges more compact by avoiding repeated meridiem text.

### Fixed

- Fixed multi-day event rendering and stacking in Day View, including timezone-aware layouts.
- Fixed overlapping child events being grouped into the same stacking cluster when their time ranges do not overlap.

## [3.6.6] - 2026-07-20

### Enhancements

- Added custom sidebar and sidebar-header content support to the Angular and Svelte adapters.

### Fixed

- Fixed runtime theme color updates and form focus colors in the event edit UI.

## [3.6.5] - 2026-05-29

### Enhancements

- Added `eventDetailTrigger` to choose whether event details open on click or double-click.
- Improved transitions between event detail panels and refined click-outside behavior.

### Fixed

- Fixed custom `gridPopupContent` rendering in Grid Year View across framework adapters.

## [3.6.4] - 2026-05-22

### Performance

- Optimized Fixed Week and Year Canvas rendering, drag previews, and event layout in Year View.

### Fixed

- Made the event detail panel and dialog mutually exclusive to prevent duplicate detail views.

## [3.6.3] - 2026-05-14

### New Features & Enhancements

- Added CalDAV and Google Calendar sync support, plus new Outlook Sync and shared Sync Core packages.
- Added source-based calendar grouping and loading states to the sidebar.
- Added `minDate` and `maxDate` constraints to the Range Picker.
- Added the `monthDateNumberContent` slot for customizing Month View date cells.
- Added runtime plugin configuration APIs with `getPluginConfig` and `updatePluginConfig`.

## [3.6.2] - 2026-05-09

### New Features & Enhancements

- Added programmatic sidebar controls for collapsing, expanding, and reading the current state.
- Added programmatic keyboard-shortcut controls for enabling, disabling, and reading the current state.

## [3.6.1] - 2026-05-06

### New Features & Enhancements

- Added configurable `eventHeight` for Month View events.

### Fixed

- Fixed `hourHeight` not affecting Day and Week View grid rows.
- Fixed reverse-drag creation anchors and drag calculations using custom hour settings.
- Fixed multi-day timed event title overlap and refined Month View event layout.
- Fixed Week View event drawers not opening on narrower desktop browsers.
- Standardized empty-grid double-click behavior and refined drag interactions.

## [3.6.0] - 2026-05-03

### New Features & Enhancements

- **Agenda List View**: Added a new `createAgendaView` factory for a scrollable agenda-style list layout. Events are grouped by day with configurable options including `daysToShow`, `showEmptyDays`, and `timeFormat` (12h/24h). Supports both timed and all-day events, multi-day event continuation indicators, and full Content Slot integration.
- **Grid Date Click Callbacks**: Added `gridDateClick` and `gridDateDoubleClick` callbacks to Month and Week views, enabling click and double-click handlers on empty date/time grid cells.
- **Mobile Event Detail as Content Slot**: Migrated the internal `MobileEventDetailComponent` to the Content Slot system, making the mobile event detail panel fully customizable via framework render props.
- **Keyboard Shortcuts Callbacks**: Added lifecycle callbacks to the keyboard-shortcuts plugin (`onKeyDown`, `onKeyUp`, and per-action hooks) for programmatic integration and custom shortcut handling.
- **Sidebar `onReorder` Callback**: Added an `onReorder` callback to the sidebar plugin, fired whenever the user drags calendars to reorder them in the list.

### Fixed

- **Range Picker `startOfWeek` Prop**: Added `startOfWeek` configuration to the range picker component so the calendar grid respects the locale or app-level week start setting.
- **`useEventDetailPanel` API**: Moved `useEventDetailPanel` into `useCalendarApp`, making the event detail panel controls accessible from the same unified app hook across React, Vue, Angular, and Svelte.
- **Framework Adapter Rendering**: Updated core rendering and framework-specific adapters (Vue, Angular, Svelte) to align with the Content Slot architecture introduced in v3.5.0.

### Performance

- **View Rendering for Large Datasets**: Significantly optimized event layout calculations across Month, Week, Day, and Year views for calendars with large numbers of events.
- **Plugin Bundle Size**: Reduced bundle size for the drag, keyboard-shortcuts, localization, sidebar, and UI packages by streamlining rollup configurations.
- **Bundle Shrink & CSS Isolation**: Reduced the core bundle footprint and eliminated residual CSS conflicts by refining the build pipeline and library import boundaries.

## [3.5.0] - 2026-04-20

### New Features & Enhancements

- **Multi-calendar Events**: Added native `calendarIds` support on events. A single event can now belong to multiple calendars, stays visible as long as any linked calendar is visible, and renders with DayFlow's built-in multi-color striped styling.

### Fixed

- **Style Self-Containment**: Completed the style refactor so DayFlow no longer depends on internal atomic CSS classes or host-side `@source` scanning. `styles.css` and `styles.components.css` are now self-contained distribution artifacts.
- **Host Style Isolation**: Tightened `df-*` semantic styling contracts across core, UI packages, plugins, and dist CSS checks to reduce conflicts with UnoCSS, Tailwind, and other host styling systems.
- **Year / Day / Week View Polish**: Refined several view-specific layout details, including year-view event rendering, day/week timezone labels, and overlay/token usage in complex UI surfaces.

### Documentation

- Added multi-calendar event documentation and showcase examples.
- Refreshed the website live demo controls and interactive examples.
- Updated setup and theme customization guidance to match the self-contained styling model and remove outdated `@source`-based integration steps.

## [3.4.0] - 2026-04-06

### New Features & Enhancements

- **Global Calendar Time Zone**: Added `timeZone` to `useCalendarApp` / `CalendarAppConfig` as the primary display and editing timezone for all views. Day, Week, Month, and Year views now share the same calendar timezone semantics.
- **Secondary Timeline Refinement**: Kept `secondaryTimeZone` for Day and Week views as a dedicated secondary timeline display setting, independent from the calendar's primary timezone.
- **Mini Calendar Event Dots**: Added richer mini calendar event dot support, including calendar-color-aware dots with up to four unique indicators per day.
- **Interactive Demo Controls**: Updated the website interactive calendar controls to expose both the global timezone and the Day/Week secondary timezone with clearer guidance.

### Fixed

- **Timezone Consistency Across Views**:
  - Unified event projection in Day/Week/Month/Year so view filtering, layout, and visible dates stay aligned with the configured calendar timezone.
- **Canonical Callback Semantics**:
  - Editing in a different calendar timezone now behaves: switching timezone only changes display, while `onEventUpdate`, `onEventDrop`, and `onEventResize` return canonical events after the edit is applied.
  - Aligned timed event creation flows such as quick create, context-menu paste, sidebar calendar drop, Month view create, and keyboard paste with `app.timeZone`.

### Documentation

- Updated timezone documentation in English, Chinese, and Japanese to describe:
  - the new app-level `timeZone`
  - Day/Week-only `secondaryTimeZone`
  - canonical callback semantics after drag/resize/edit operations
- Refreshed the website interactive calendar help text and tooltips to match the new timezone model.

## [3.3.0] - 2026-03-20

### New Features & Enhancements

- **Grid Year View**: Added a new `grid` mode for `createYearView`, providing a compact month-grid layout with heatmap intensity colors for event density visualization.
- **`@create-dayflow` CLI**: Introduced the `npm create dayflow@latest` scaffolding tool. Interactively configures a new project with framework selection (React, Vue, Angular, Svelte), TypeScript support, and Tailwind CSS integration.
- **`renderSidebarHeader`**: Added a `renderSidebarHeader` render prop to the sidebar plugin, allowing full customization of the sidebar header area (e.g. user avatar, collapse toggle).

### Fixed

- **Style Isolation**: Fixed `tailwind-components.css` overriding host application styles. DayFlow's component CSS no longer emits Tailwind utility classes or leaks bare pseudo-class selectors (`:focus-visible`, `:checked`) to the host app.
- **`bg-primary` Pollution**: Resolved context menu, sidebar merge menu, and calendar list items using the host application's `--color-primary` instead of DayFlow's own color variables. All interactive elements now use `var(--df-color-*)` directly.
- **Month View Scroll**: Clicking on cross-month dates (previous month's trailing dates in the first row, next month's leading dates in the last row) no longer triggers unwanted month navigation.
- **Portal Color Scope**: Added `df-portal` class to all `createPortal` root elements so portaled components (context menus, dialogs, drawers) correctly inherit DayFlow's color token scope.

### Style

- Added `df-` prefix scoping to CSS class names in `tailwind-components.css` and `tailwind.css` to prevent conflicts with host application Tailwind instances.
- Remapped `--color-primary` and related tokens within `.df-calendar-container` and `.df-portal` to always resolve to DayFlow's own `--df-color-*` variables, regardless of host app theme.

### Documentation

- Migrated website from Nextra to Fumadocs.
- Updated installation guides to feature `@create-dayflow` CLI as the primary setup method.
- Updated theme customization guide.
- Added `renderSidebarHeader` API documentation.

## [3.2.0] - 2026-02-28

### New Features & Enhancements

- **Drag & Drop Improvements**:
  - Added `onEventDrop` and `onEventResize` callbacks to the drag plugin for better event handling.
  - Updated Month and Year View all-day event drag indicators for better visual feedback.
- **View Enhancements**:
  - Added `secondaryTimeZone` label support for Day and Week Views.
  - Added `timeFormat` configuration for Day and Week Views.
  - Updated configuration options for `monthView` and `yearView`.
- **Developer Experience**:
  - Introduced `oxlint` for faster linting and improved code quality.
  - Added `pre-commit` hooks and `format:check` scripts to ensure code consistency.
  - Migrated to `pnpm workspace catalog` for better dependency management.
  - Added `.editorconfig` and improved VSCode settings/extensions recommendations.

### Performance

- **Scrolling**: Optimized `MonthView` scrolling performance by memoizing scrollbar checks.

### Fixed

- **Layout**: Resolved `eventLayout` stacking issues and improved mobile `WeekView` layout.
- **Framework Support**: Corrected `ng-packagr` configuration schema path for Angular.
- **Build & Packaging**:
  - Fixed CSS export errors and website build issues.
  - Removed duplicate `peerDependencies` in `package.json` files.
  - Fixed Tailwind CSS path configurations.
- **UI/UX**: Fixed an issue where the "+ more" click in the website had no reaction.
- **Documentation**: Corrected README image paths and updated view documentation.

### Style

- Improved Day/Week View event resize pointer display.
- Cleaned up Tailwind CSS class formatting.
- Resolved various lint warnings reported by `oxlint`.

## [3.1.0] - 2026-02-20

### Plugin Architecture & Decoupling

This release introduces a new plugin-based architecture, further reducing the core bundle size and providing greater flexibility. Core features have been extracted into independent, optional packages.

#### New Plugin Packages (v1.0.0)

- **`@dayflow/plugin-drag`**: Handles all drag-and-drop interactions (move, resize, and create).
- **`@dayflow/plugin-keyboard-shortcuts`**: Provides keyboard navigation and shortcuts support.
- **`@dayflow/plugin-localization`**: Dedicated package for multi-language support and internationalization.
- **`@dayflow/plugin-sidebar`**: Extracts the sidebar UI and logic into a standalone plugin.

### New Features & Enhancements

- **Enhanced Visibility Control**:
  - Added `onVisibleRangeChange` callback with a `reason` parameter (scroll vs. navigation).
  - Marked `onVisibleMonthChange` as deprecated in favor of the more flexible range change callback.
- **Improved API**: Simplified framework wrappers by removing the `sidebarConfig` attribute (now handled via the sidebar plugin).
- **UI Refresh**: Updated the view switching button styles for a more modern look and feel.

### Fixed

- **Accessibility**: Fixed an event scaling issue when using the keyboard `Tab` key for navigation.
- **Search**: Improved search result location accuracy within the calendar views.
- **Documentation**: Comprehensive updates to plugin documentation and multi-language guides.

### Breaking Changes

- **Feature Extraction**: Drag-and-drop, keyboard shortcuts, and the sidebar are no longer included in `@dayflow/core` by default. You must install and register the corresponding plugins to retain these features.
- **Sidebar Configuration**: The `sidebarConfig` prop has been removed from framework adapters. Configuration is now passed directly to the `@dayflow/plugin-sidebar` during initialization.

## [3.0.0] - 2026-02-15

### Major Architectural Overhaul: Multi-Framework Support

This version marks a complete rewrite of the DayFlow internal architecture, moving from a React-only library to a **framework-agnostic monorepo structure**.

#### New Package Structure

- **`@dayflow/core`**: The new heart of DayFlow. Powered by **Preact**, it handles all state management, layout algorithms, and the core rendering engine (~3KB gzipped).
- **`@dayflow/react`**: High-performance React adapter.
- **`@dayflow/vue`**: Brand new adapter for Vue 3.
- **`@dayflow/svelte`**: Brand new adapter for Svelte 5 (with full SSR support).
- **`@dayflow/angular`**: Brand new adapter for Angular (v14+).

### New Features

- **Framework Agnostic**: Core logic and UI are now decoupled from specific frameworks.
- **Improved Content Injection**: New **Content Slots** system allowing users to inject native framework components (React/Vue/Svelte/Angular) into the Preact-driven calendar.
- **SSR Ready**:
  - **Svelte**: Provided dedicated SSR bundles (`dist/index.ssr.js`) to avoid DOM reference errors during server-side rendering.
  - **React/Vue**: Enhanced hydration safety.

### Fixed & Improved

- Optimized mobile responsiveness for all framework adapters.
- Improved build process using Rollup and Turborepo for faster and smaller bundles.

### Breaking Changes

- **Package Names**: If you were using the old `dayflow` package, you should now migrate to framework-specific packages (e.g., `@dayflow/react`).
- **Import Paths**:
  - Components and hooks are now exported from `@dayflow/[framework]`.
  - Core types and utilities are exported from `@dayflow/core`.
- **External Dependencies**: To maintain framework-agnosticism, the built-in color picker (`react-color`) has been removed. Users should now provide their own color picker via Content Slots.

---
