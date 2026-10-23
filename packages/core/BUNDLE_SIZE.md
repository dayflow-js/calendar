# Core bundle size audit

Measured on 2026-10-23. Sizes below use KiB (1,024 bytes), gzip level 9,
and Node's Brotli defaults. These are production builds with the same installed
toolchain, not development-server sizes.

## Task overhead

The pre-task baseline is commit `97e67bf8`. It was built in an isolated source
snapshot, including its own context-menu and range-picker builds. The task column
includes the task feature and subsequent editor, styling, and configuration changes.

| Published asset           | Before tasks | With tasks, before optimization | After optimization |
| ------------------------- | -----------: | ------------------------------: | -----------------: |
| Full ESM JavaScript, raw  |    405.2 KiB |                       413.1 KiB |          412.7 KiB |
| Full ESM JavaScript, gzip |    110.2 KiB |                       112.9 KiB |          112.6 KiB |
| Component CSS, gzip       |     18.5 KiB |                        18.9 KiB |           18.9 KiB |

Tasks and the follow-up changes added 8,141 raw JS bytes / 2,724 gzip bytes,
and 2,100 raw component CSS bytes / 407 gzip bytes before optimization.

Current exact sizes:

| Asset                   | Raw bytes | Gzip bytes | Brotli bytes |
| ----------------------- | --------: | ---------: | -----------: |
| `index.esm.js`          |   422,564 |    115,313 |       93,812 |
| `styles.components.css` |   135,608 |     19,318 |       16,442 |
| `styles.css`            |   138,968 |     20,303 |       17,285 |
| `index.d.ts`            |   140,042 |     33,536 |       27,515 |

The npm tarball is approximately 186.5 KiB compressed / 825.2 KiB unpacked.
It includes both CSS variants and type declarations. An application imports one
CSS variant; declarations are not browser runtime code. The full JS plus component
CSS costs about 131.5 KiB gzip before external runtime dependencies.

## Consumer tree shaking

Each probe exports only the named APIs from the published ESM, then bundles and
minifies it with Rollup and Terser. External runtime dependencies are kept external
in both measurements. Application bundlers and configurations can produce different
results. Re-exporting the APIs keeps them live instead of measuring an empty bundle.

| APIs retained                                        | Before optimization, gzip | After optimization, gzip |
| ---------------------------------------------------- | ------------------------: | -----------------------: |
| `isTask`                                             |                  29,574 B |         1,727 B (-94.2%) |
| `CalendarApp`, `createMonthView`                     |                  61,892 B |         58,822 B (-5.0%) |
| `CalendarApp`, `CalendarRenderer`, `createMonthView` |                  77,307 B |         74,360 B (-3.8%) |
| App, renderer, all five view factories               |                 103,581 B |        103,743 B (+0.2%) |

The benefit is removing unused code, not a large reduction when every feature is
used. Full-feature compressed size is effectively unchanged; minification and
symbol allocation can shift it slightly in either direction.

## Changes

- Keep memo initialization and `displayName` assignment inside one pure factory.
  Mark context/default-instance initialization as removable when unused, and retain
  those annotations in the published minified ESM.
- Keep Preact's JSX runtime external in core and the bundled UI packages, allowing
  the consumer to share it instead of embedding copies.
- Refine minifier passes and hoisting without changing the ES2015 build target.
- Add a 2 KiB gzip utility-import regression budget.
- Parse string literals in the CSS guard with TypeScript instead of comment/quote
  regexes, which could hang on minified output with preserved PURE annotations.

## Reproduce

Run from the repository root after installing dependencies:

```sh
pnpm --filter @dayflow/ui-context-menu build
pnpm --filter @dayflow/ui-range-picker build
pnpm --filter @dayflow/core build
pnpm --filter @dayflow/core size
pnpm --filter @dayflow/core check:tree-shaking
```

`size` also accepts a dist directory as its first argument; the tree-shaking script
accepts an alternate ESM path. Both emit machine-readable JSON measurements.

## Limits and next steps

Preact, `temporal-polyfill`, `tslib`, and Blossom Color Picker JavaScript are
external and excluded from these measurements. Range-picker and context-menu code
is bundled into core and is included. Dependency transfer sizes need a separate
application build; npm dependency installation size is a different metric again.

`enableTasks: false` is a runtime UI option. It does not remove task code from the
built-in editors at build time.

Larger future reductions would require optional entry points or lazy loading for
views/editors, and optional plugin-specific CSS. Those change loading or styling
contracts and are outside this compatibility-preserving optimization.
