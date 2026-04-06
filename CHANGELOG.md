# Changelog

All notable changes to this project will be documented in this file.

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
