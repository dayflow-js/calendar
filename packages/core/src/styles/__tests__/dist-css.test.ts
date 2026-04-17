/**
 * CSS dist output integrity tests
 *
 * These tests guard against the two recurring CSS issues:
 *
 * Issue #69 / hccullen PR — two problems when DayFlow CSS is used alongside
 * host-app Tailwind CSS:
 *   1. Tailwind utility class conflicts break responsive layouts
 *      (e.g. `flex-col` emitted by DayFlow overrides host `md:flex-row`)
 *   2. Missing scoped `--color-*` mappings cause DayFlow's colors to bleed
 *      into, or be overridden by, the host app's Tailwind theme
 *
 * Run after `pnpm build` — tests read compiled artifacts from dist/.
 */

import fs from 'node:fs';
import path from 'node:path';

// ─── helpers ───────────────────────────────────────────────────────────────

// eslint-disable-next-line unicorn/prefer-module
const DIST = path.resolve(__dirname, '../../../dist');

function readDist(filename: string): string {
  const full = path.join(DIST, filename);
  if (!fs.existsSync(full)) {
    throw new Error(
      `Dist file not found: ${full}\nRun "pnpm build" before running CSS integrity tests.`
    );
  }
  return fs.readFileSync(full, 'utf-8');
}

/**
 * Extract the content inside the first CSS block whose selector line matches
 * the given regex. Returns null if not found.
 */
function extractBlock(css: string, selectorPattern: RegExp): string | null {
  // Match the selector line(s) followed by { ... }
  // Handles multi-line selectors like ".df-calendar-container,\n.df-portal {"
  const re = new RegExp(
    selectorPattern.source + String.raw`\s*\{([^}]+)\}`,
    selectorPattern.flags
  );
  const match = css.match(re);
  return match ? match[1] : null;
}

function extractToken(css: string, token: string): string | undefined {
  return css.match(new RegExp(`${token}:\\s*([^;]+)`))?.[1]?.trim();
}

// ─── fixtures ──────────────────────────────────────────────────────────────

// All --color-* tokens that must be mapped inside the DayFlow scoped root
// block so that host-Tailwind-generated utilities resolve to DayFlow's own
// design tokens rather than the host application's theme.
const REQUIRED_COLOR_MAPPINGS: string[] = [
  '--color-background',
  '--color-foreground',
  '--color-hover',
  '--color-border',
  '--color-card',
  '--color-card-foreground',
  '--color-muted',
  '--color-muted-foreground',
  '--color-primary',
  '--color-primary-foreground',
  '--color-secondary',
  '--color-secondary-foreground',
  '--color-destructive',
  '--color-destructive-foreground',
  // Tailwind v4 arbitrary CSS-variable syntax: hover:bg-(--hover)
  // generates background-color: var(--hover); this must be defined.
  '--hover',
];

// Bare Tailwind utility selectors that must NOT appear in styles.components.css.
// If they appear at the top level, they conflict with host-app Tailwind
// instances and can break responsive layouts (issue #69 / hccullen PR).
// Patterns are anchored with ^ + multiline flag so they only match when the
// utility class is the *entire* selector on a line — not when it appears as
// part of a compound selector like `.df-portal .bg-primary {`.
const FORBIDDEN_BARE_UTILITIES = [
  // layout — the class most clearly demonstrated to break responsive design
  String.raw`^\.flex-col\s*\{`,
  String.raw`^\.flex-row\s*\{`,
  String.raw`^\.md\\:flex-row\s*\{`,
  // semantic color utilities — would override host theme colors outside
  // the DayFlow container
  String.raw`^\.bg-background\s*\{`,
  String.raw`^\.bg-primary\s*\{`,
  String.raw`^\.text-primary\s*\{`,
  String.raw`^\.bg-secondary\s*\{`,
  String.raw`^\.border-border\s*\{`,
  String.raw`^\.ring-primary\s*\{`,
];

// Returns true for selectors that are permitted in styles.components.css:
// DayFlow component classes (.df-*), color-picker dependency (.bcp-*),
// and dark-mode scope (.dark ...).
function isDayFlowSelector(sel: string): boolean {
  return (
    sel.startsWith('.df-') ||
    sel.startsWith('.bcp-') ||
    sel.startsWith('.dark ')
  );
}

const SCOPE_BLOCK_SELECTOR =
  /\.df-calendar-container,\s*\n?\s*\.df-portal,\s*\n?\s*\.df-event-detail-panel,\s*\n?\s*\.df-dialog-container,\s*\n?\s*\.df-range-picker/;

// ─── tests ─────────────────────────────────────────────────────────────────

describe('CSS dist output integrity', () => {
  let componentsCss: string;
  let fullCss: string;

  beforeAll(() => {
    componentsCss = readDist('styles.components.css');
    fullCss = readDist('styles.css');
  });

  // ── Guard #1: styles.components.css must not emit bare Tailwind utilities ──
  //
  // This is the root cause of issue #69 and the hccullen PR.
  // styles.components.css is designed for projects that have their own Tailwind
  // instance. If it also emits utility classes, two Tailwind instances fight
  // over cascade order and responsive breakpoints break.
  describe('styles.components.css — no bare Tailwind utility classes emitted', () => {
    test.each(FORBIDDEN_BARE_UTILITIES)(
      'must not contain top-level utility selector: %s',
      pattern => {
        expect(componentsCss).not.toMatch(new RegExp(pattern, 'm'));
      }
    );

    it('only emits df-* and bcp-* namespaced selectors at the top level', () => {
      // Every top-level rule (lines starting with ".") must belong to DayFlow
      // (.df-*), the color-picker dependency (.bcp-*), or a dark-mode
      // modifier (.dark ...) — never a bare Tailwind utility.
      const topLevelSelectors = componentsCss
        .split('\n')
        .filter(line => /^\.[a-z]/.test(line.trim())) // lines starting with "."
        .map(line => line.trim());

      const violations = topLevelSelectors.filter(
        sel => !isDayFlowSelector(sel)
      );

      expect(violations).toEqual([]);
    });

    it('does not ship unresolved @source directives', () => {
      expect(componentsCss).not.toMatch(/@source\s+/);
      expect(fullCss).not.toMatch(/@source\s+/);
    });
  });

  // ── Guard #2: All color token mappings present in the scoped root block ──
  //
  // The scoped DayFlow root block remaps Tailwind's semantic --color-* tokens
  // to DayFlow's own --df-color-* variables.
  // Missing entries cause host-Tailwind-generated utility classes (e.g.
  // bg-secondary, border-border) to resolve to the host theme's colors
  // instead of DayFlow's, producing wrong colors inside the calendar.
  describe.each([
    ['styles.components.css', () => componentsCss],
    ['styles.css', () => fullCss],
  ] as const)('%s — scoped root mapping block', (_file, getCss) => {
    it('block exists in the file', () => {
      const block = extractBlock(getCss(), SCOPE_BLOCK_SELECTOR);
      expect(block).not.toBeNull();
    });

    test.each(REQUIRED_COLOR_MAPPINGS)(
      'maps %s to a DayFlow variable',
      token => {
        const block = extractBlock(getCss(), SCOPE_BLOCK_SELECTOR);
        // Each token must be present and point to a --df-color-* variable
        expect(block).toContain(token);
        const tokenLine = block!.split('\n').find(l => l.includes(token));
        expect(tokenLine).toMatch(/var\(--df-color-|var\(--df-/);
      }
    );
  });

  // ── Guard #3: Component rules use CSS variables, not hardcoded gray values ──
  //
  // Before this fix, .df-calendar-container used @apply bg-white dark:bg-gray-900
  // which hardcodes specific gray values and ignores the --df-color-* theme
  // variables — meaning theme customization via CSS variable overrides had no
  // effect on bundled-Tailwind users.
  describe.each([
    ['styles.components.css', () => componentsCss],
    ['styles.css', () => fullCss],
  ] as const)(
    '%s — component rules use CSS variables not hardcoded colors',
    (_file, getCss) => {
      it('.df-calendar-container background uses var(--df-color-background)', () => {
        expect(getCss()).toMatch(
          /background-color:\s*var\(--df-color-background\)/
        );
      });

      it('.df-calendar-container border uses var(--df-color-border)', () => {
        expect(getCss()).toMatch(
          /border:\s*1px solid var\(--df-color-border\)/
        );
      });

      it('.df-week-header border-color uses var(--df-color-border)', () => {
        expect(getCss()).toMatch(
          /\.df-week-header[\s\S]{0,200}border-color:\s*var\(--df-color-border\)/
        );
      });

      it('.df-event-detail-panel background uses var(--df-color-card)', () => {
        expect(getCss()).toMatch(
          /\.df-event-detail-panel[\s\S]{0,200}background-color:\s*var\(--df-color-card\)/
        );
      });

      it('no DayFlow component rule hardcodes rgb(255 255 255) as background', () => {
        // Utility classes like .bg-white { background-color: rgb(255 255 255) }
        // are expected in styles.css; the concern is component-level rules
        // (.df-*) using hardcoded white instead of var(--df-color-background).
        const matches = getCss().matchAll(
          /\.(df-[a-z-]+)\s*\{[^}]*background-color:\s*rgb\(255 255 255\)[^}]*}/g
        );
        expect([...matches]).toEqual([]);
      });

      it('no DayFlow component rule hardcodes a specific gray as border-color', () => {
        // Hardcoded border-color: var(--color-gray-200) in a .df-* rule would
        // break when the host overrides Tailwind's gray palette.
        const matches = getCss().matchAll(
          /\.(df-[a-z-]+)\s*\{[^}]*border-color:\s*var\(--color-gray-\d+\)[^}]*}/g
        );
        expect([...matches]).toEqual([]);
      });
    }
  );

  describe('styles.components.css — semantic fallback coverage', () => {
    it('no longer relies on dark:bg-primary/20 fallback after df-* migration', () => {
      expect(componentsCss).not.toMatch(/\.dark\\:bg-primary\\\/20/);
    });

    it('no longer relies on shadow-primary fallback after df-* migration', () => {
      expect(componentsCss).not.toMatch(/\.shadow-primary\\(?:\/20)?/);
    });

    it('no longer relies on destructive hover/focus fallback after df-* migration', () => {
      expect(componentsCss).not.toMatch(/\.hover\\:bg-destructive:hover/);
      expect(componentsCss).not.toMatch(/\.focus\\:bg-destructive:focus/);
      expect(componentsCss).not.toMatch(
        /\.hover\\:text-destructive-foreground:hover/
      );
      expect(componentsCss).not.toMatch(
        /\.focus\\:text-destructive-foreground:focus/
      );
    });

    it('includes portal and range picker scope selectors', () => {
      expect(componentsCss).toMatch(
        /df-portal[\s\S]*df-range-picker|df-range-picker[\s\S]*df-portal/
      );
    });
  });

  describe.each([
    ['styles.components.css', () => componentsCss],
    ['styles.css', () => fullCss],
  ] as const)('%s — df-* semantic classes are emitted', (_file, getCss) => {
    it('includes df-fill-primary and df-tint-primary rules', () => {
      expect(getCss()).toMatch(/\.df-fill-primary\s*\{/);
      expect(getCss()).toMatch(/\.df-tint-primary\s*\{/);
    });

    it('includes df-focus-ring and df-ring-primary-solid rules', () => {
      expect(getCss()).toMatch(/\.df-focus-ring:focus\s*\{/);
      expect(getCss()).toMatch(/\.df-ring-primary-solid\s*\{/);
    });

    it('includes df-fill-destructive and df-hover-destructive rules', () => {
      expect(getCss()).toMatch(/\.df-fill-destructive\s*\{/);
      expect(getCss()).toMatch(/\.df-hover-destructive:hover\s*\{/);
    });
  });

  describe('shared foundation parity', () => {
    it('shares core token values across both dist files', () => {
      [
        '--df-color-background',
        '--df-color-primary',
        '--df-color-border',
      ].forEach(token => {
        expect(extractToken(fullCss, token)).toBe(
          extractToken(componentsCss, token)
        );
      });
    });

    it('shares system-preference dark tokens across both dist files', () => {
      const pattern =
        /@media\s*\(prefers-color-scheme:\s*dark\)[\s\S]*?--df-color-background:\s*([^;]+)/;
      expect(fullCss.match(pattern)?.[1]?.trim()).toBe(
        componentsCss.match(pattern)?.[1]?.trim()
      );
    });

    it('keeps df-portal scope in both dist files', () => {
      expect(fullCss).toMatch(/\.df-portal/);
      expect(componentsCss).toMatch(/\.df-portal/);
    });
  });
});
