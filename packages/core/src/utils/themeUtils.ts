/**
 * Theme Utility Functions
 *
 * This module provides utility functions for working with theme-aware class names.
 */

/**
 * Combine class names with theme-specific variants
 *
 * @param base - Base class names (applied in both themes)
 * @param light - Light mode specific class names
 * @param dark - Dark mode specific class names (will be prefixed with 'dark:')
 * @returns Combined class name string
 *
 * @example
 * ```ts
 * themeCn('p-4 rounded', 'bg-white text-black', 'bg-gray-900 text-white')
 * // Returns: 'p-4 rounded bg-white text-black dark:bg-gray-900 dark:text-white'
 * ```
 */
export const themeCn = (base: string, light: string, dark: string): string => {
  const darkClasses = dark
    .split(' ')
    .filter(Boolean)
    .map(cls => `dark:${cls}`)
    .join(' ');

  return `${base} ${light} ${darkClasses}`.trim();
};

/**
 * Common theme class combinations
 *
 * Pre-defined class combinations for common UI elements.
 * Use these for consistency across the application.
 */
export const themeClasses = {
  // Container styles
  container: 'bg-white dark:bg-gray-900',
  card: 'bg-white dark:bg-gray-800',
  sidebar: 'bg-gray-50 dark:bg-gray-900',

  // Text colors
  text: 'text-gray-900 dark:text-gray-100',
  textMuted: 'text-gray-500 dark:text-gray-400',
  textSubtle: 'text-gray-600 dark:text-gray-300',
  textEmphasis: 'text-gray-900 dark:text-white',

  // Border colors
  border: 'border-gray-200 dark:border-gray-700',
  borderLight: 'border-gray-100 dark:border-gray-800',
  borderStrong: 'border-gray-300 dark:border-gray-600',

  // Background colors
  bgPrimary: 'bg-white dark:bg-gray-900',
  bgSecondary: 'bg-gray-50 dark:bg-gray-800',
  bgTertiary: 'bg-gray-100 dark:bg-gray-700',
  bgMuted: 'bg-gray-100 dark:bg-gray-800',

  // Interactive states
  hover: 'hover:bg-gray-100 dark:hover:bg-gray-800',
  hoverSubtle: 'hover:bg-gray-50 dark:hover:bg-gray-900',
  active: 'bg-gray-200 dark:bg-gray-700',
  focus: 'focus:ring-primary',

  // Input styles
  input:
    'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100',
  inputFocus: 'focus:border-primary focus:ring-primary',

  // Button styles
  buttonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  buttonSecondary:
    'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600',
  buttonDanger:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  buttonSuccess:
    'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800',

  // Shadow
  shadow: 'shadow-sm dark:shadow-gray-900/50',
  shadowMd: 'shadow-md dark:shadow-gray-900/50',
  shadowLg: 'shadow-lg dark:shadow-gray-900/50',

  // Divider
  divider: 'border-gray-200 dark:border-gray-700',
};

/**
 * Conditional theme class
 *
 * Returns different class names based on a condition.
 *
 * @param condition - Condition to evaluate
 * @param whenTrue - Class names when condition is true
 * @param whenFalse - Class names when condition is false
 * @returns Class name string based on condition
 *
 * @example
 * ```ts
 * conditionalTheme(isActive, 'bg-blue-500 dark:bg-blue-600', 'bg-gray-200 dark:bg-gray-700')
 * ```
 */
export const conditionalTheme = (
  condition: boolean,
  whenTrue: string,
  whenFalse: string
): string => {
  return condition ? whenTrue : whenFalse;
};

/**
 * Merge multiple class names, filtering out falsy values
 *
 * @param classes - Array of class names or falsy values
 * @returns Merged class name string
 *
 * @example
 * ```ts
 * mergeClasses('p-4', isActive && 'bg-blue-500', 'rounded')
 * // Returns: 'p-4 bg-blue-500 rounded' (if isActive is true)
 * ```
 */
export const mergeClasses = (
  ...classes: (string | undefined | null | false)[]
): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Resolve the currently applied theme on the document.
 *
 * This inspects common override hooks (like `data-dayflow-theme-override` or
 * manual `dark`/`light` classes) so host applications can force a theme even
 * when DayFlow is configured in `auto` mode.
 */
export const resolveAppliedTheme = (
  effectiveTheme: 'light' | 'dark'
): 'light' | 'dark' => {
  if (typeof document === 'undefined') {
    return effectiveTheme;
  }

  const root = document.documentElement;

  const overrideAttributes = [
    root.getAttribute('data-dayflow-theme-override'),
    root.getAttribute('data-theme-override'),
    root.getAttribute('data-theme'),
  ];

  for (const attr of overrideAttributes) {
    if (attr === 'light' || attr === 'dark') {
      return attr;
    }
  }

  if (root.classList.contains('dark')) {
    return 'dark';
  }

  if (root.classList.contains('light')) {
    return 'light';
  }

  return effectiveTheme;
};
