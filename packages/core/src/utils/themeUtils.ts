import { ThemeColors } from '@/types/calendarTypes';

const THEME_COLOR_TOKEN_MAP: Record<string, string> = {
  background: '--df-color-background',
  text: '--df-color-foreground',
  foreground: '--df-color-foreground',
  hover: '--df-color-hover',
  border: '--df-color-border',
  card: '--df-color-card',
  cardForeground: '--df-color-card-foreground',
  'card-foreground': '--df-color-card-foreground',
  muted: '--df-color-muted',
  mutedForeground: '--df-color-muted-foreground',
  'muted-foreground': '--df-color-muted-foreground',
  primary: '--df-color-primary',
  primaryForeground: '--df-color-primary-foreground',
  'primary-foreground': '--df-color-primary-foreground',
  secondary: '--df-color-secondary',
  secondaryForeground: '--df-color-secondary-foreground',
  'secondary-foreground': '--df-color-secondary-foreground',
  destructive: '--df-color-destructive',
  destructiveForeground: '--df-color-destructive-foreground',
  'destructive-foreground': '--df-color-destructive-foreground',
  ring: '--df-color-ring',
};

export const getThemeColorCssVariables = (
  colors?: ThemeColors
): Record<string, string> => {
  if (!colors) {
    return {};
  }

  const cssVariables: Record<string, string> = {};

  for (const [key, value] of Object.entries(colors)) {
    if (!value) continue;

    const token = key.startsWith('--df-color-')
      ? key
      : THEME_COLOR_TOKEN_MAP[key];
    if (token) {
      cssVariables[token] = value;
    }
  }

  return cssVariables;
};

/**
 * Resolve the currently applied theme on the document.
 */
export const resolveAppliedTheme = (
  effectiveTheme: 'light' | 'dark'
): 'light' | 'dark' => {
  if (typeof document === 'undefined') {
    return effectiveTheme;
  }

  const root = document.documentElement;

  const overrideAttributes = [
    root.dataset.dfThemeOverride,
    root.dataset.dfTheme,
    root.dataset.theme,
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
