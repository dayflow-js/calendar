/**
 * Style Utility Functions
 *
 * This module provides utility functions for working with CSS styles.
 */

const DEFAULT_WIDTH = '240px';

/**
 * Normalize a width value to a CSS string
 *
 * Converts numeric values to pixels and validates string values.
 * Returns a default width if the input is invalid.
 *
 * @param width - Width as number (pixels) or CSS string
 * @param defaultWidth - Default width to use if input is invalid (default: '240px')
 * @returns Normalized CSS width string
 *
 * @example
 * ```ts
 * normalizeCssWidth(300) // '300px'
 * normalizeCssWidth('20rem') // '20rem'
 * normalizeCssWidth('') // '240px'
 * normalizeCssWidth(undefined) // '240px'
 * ```
 */
export function normalizeCssWidth(
  width?: number | string,
  defaultWidth: string = DEFAULT_WIDTH
): string {
  if (typeof width === 'number') {
    return `${width}px`;
  }
  if (typeof width === 'string' && width.trim().length > 0) {
    return width;
  }
  return defaultWidth;
}

/**
 * Check if the calendar's scrollbar takes up space in the layout.
 *
 * Tests inside a .df-calendar-container element so the library's scoped
 * scrollbar CSS applies (scrollbar-width: thin; ::-webkit-scrollbar { width: 2px }).
 * Also overrides any host-app CSS that hides scrollbars (e.g. display: none),
 * since we need to measure the actual rendered scrollbar width.
 *
 * @returns true if the calendar scrollbar takes space, false otherwise
 */
export function scrollbarTakesSpace(): boolean {
  if (typeof document === 'undefined') return false;

  // Override host-app ::-webkit-scrollbar { display: none } so measurement is accurate
  const styleEl = document.createElement('style');
  styleEl.textContent =
    '.df-calendar-container .__df_measure__::-webkit-scrollbar { display: block !important; }';
  document.head.append(styleEl);

  // Test inside .df-calendar-container so scoped scrollbar CSS applies
  const container = document.createElement('div');
  container.className = 'df-calendar-container';
  container.style.cssText =
    'position:absolute;top:-9999px;width:100px;height:100px;overflow:hidden';

  const div = document.createElement('div');
  div.className = '__df_measure__';
  div.style.cssText = 'width:100px;height:100px;overflow:scroll';

  container.append(div);
  document.body.append(container);

  const takesSpace = div.offsetWidth - div.clientWidth > 0;

  container.remove();
  styleEl.remove();

  return takesSpace;
}
