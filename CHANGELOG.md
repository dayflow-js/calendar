# Changelog

All notable changes to this project will be documented in this file.

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