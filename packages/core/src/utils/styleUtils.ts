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
 * Check if the browser's scrollbar takes up space in the layout.
 *
 * Some browsers (like Safari on macOS with "Show scroll bars: When scrolling" setting)
 * use overlay scrollbars that don't take up space, while others (like Chrome on Windows)
 * use scrollbars that reduce the available width of the container.
 *
 * @returns true if scrollbar takes space, false otherwise
 */
export function scrollbarTakesSpace(): boolean {
  if (typeof document === 'undefined') return false;

  const div = document.createElement('div');
  div.style.width = '100px';
  div.style.height = '100px';
  div.style.overflow = 'scroll';
  div.style.position = 'absolute';
  div.style.top = '-9999px';

  document.body.appendChild(div);

  const takesSpace = div.offsetWidth - div.clientWidth > 0;

  document.body.removeChild(div);

  return takesSpace;
}
