# Changelog page

`/changelog` is built from the repository `CHANGELOG.md`. This folder holds
the extra content the page shows for feature releases.

- **Feature releases** have a `New Features` or `Breaking Changes` section, or
  an entry in `releases.ts`. They show a title, summary, screenshots and the
  New list. All other sections go in a collapsed "Improvements · Fixes" block.
- **Minor releases** (only fixes, performance, polish) need nothing here. They
  are listed compactly with tags taken from their section headings
  (`### Fixed` → Fixes) and from the views and `@dayflow/*` packages they
  mention.

## Adding screenshots for a release

Screenshots are taken from the website demo (`/demo`), in light and dark.

1. Add a shot to `shots.json`:

   ```json
   {
     "name": "half-hour-lines",
     "alt": "Week view with half-hour grid lines",
     "path": "/demo?view=week&showHalfHourLines=1&showSidebar=0&controls=0"
   }
   ```

   `path` opens the demo in a given state. Every boolean in
   `CalendarFeatures` can be set (`enableTasks=1`, `showSidebar=0`, …), plus
   `view`, `yearMode`, `timeZone`, `secondaryTimeZone` and `locale`;
   `controls=0` hides the control panel.

   Optional fields:
   - `steps`: run in order before capturing. `{ "click": selector }` clicks
     with a real mouse event, `{ "eval": js }` runs a script, `{ "wait": ms }`
     and `{ "waitFor": selector }` pause.
   - `clip`: a selector, or a list of selectors to crop around (default:
     the whole calendar). `padding` adds space around the crop.
   - `viewport`: `{ "width": 1280, "height": 860 }` by default.

   To open an event, click it by id:
   `.df-calendar-container [data-event-id="demo-meeting"]`. Sample events
   live in `utils/sampleData.ts`.

2. With the dev server running (`npm run dev`), capture it:

   ```bash
   npm run changelog:capture half-hour-lines
   ```

   This writes `public/images/changelog/half-hour-lines.webp`,
   `half-hour-lines-dark.webp` and the size in `manifest.json`. Run it without
   a name to recapture everything, for example after a visual change.

3. Reference it in `releases.ts`:

   ```ts
   '3.8.0': {
     title: 'Half-hour grid lines',
     summary: 'Dashed lines at every half hour in Day and Week view.',
     images: ['half-hour-lines'],
   },
   ```

   The first image is the hero; others show in a two-column grid below it.

An image that cannot come from the demo (for example a Pro plugin) can be
added by hand: put `<name>.webp` in `public/images/changelog` and add its
`width`, `height` and `alt` to `manifest.json`. A `<name>-dark.webp` is used
in dark mode when present.
