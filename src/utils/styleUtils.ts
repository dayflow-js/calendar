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
