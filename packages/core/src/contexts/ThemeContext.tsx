import { h, createContext, ComponentChildren } from 'preact';
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useMemo,
} from 'preact/hooks';

import { ThemeColors, ThemeMode } from '@/types/calendarTypes';
import {
  getThemeColorCssVariables,
  resolveAppliedTheme,
} from '@/utils/themeUtils';

/**
 * Theme Context Type
 */
export interface ThemeContextType {
  /** Current theme mode (can be 'auto') */
  theme: ThemeMode;
  /** Effective theme (resolved, never 'auto') */
  effectiveTheme: 'light' | 'dark';
  /** Set theme mode */
  setTheme: (mode: ThemeMode) => void;
}

/**
 * Theme Context
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme Provider Props
 */
export interface ThemeProviderProps {
  children: ComponentChildren;
  /** Initial theme mode */
  initialTheme?: ThemeMode;
  /** Runtime system-level color tokens */
  colors?: ThemeColors;
  /** Callback when theme changes */
  onThemeChange?: (theme: ThemeMode, effectiveTheme: 'light' | 'dark') => void;
}

/**
 * Theme Provider Component
 *
 * Manages theme state and applies it to the document root.
 * Supports 'light', 'dark', and 'auto' modes.
 *
 * @example
 * ```tsx
 * <ThemeProvider initialTheme="auto">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export const ThemeProvider = ({
  children,
  initialTheme = 'light',
  colors,
  onThemeChange,
}: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme as ThemeMode);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return 'light';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  // Compute effective theme (resolve 'auto' to actual theme)
  const effectiveTheme: 'light' | 'dark' =
    theme === 'auto' ? systemTheme : theme;

  /**
   * Sync initialTheme prop changes to internal state
   */
  useEffect(() => {
    setThemeState(initialTheme as ThemeMode);
  }, [initialTheme]);

  /**
   * Set theme mode
   */
  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  /**
   * Listen to system theme changes (for 'auto' mode)
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);
    };

    // Listen for changes
    // Use addEventListener if available (modern browsers), fallback to addListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  /**
   * Apply theme to document root
   * useLayoutEffect ensures the class is applied synchronously before the
   * browser paints, preventing a flash of the wrong theme when the OS is in
   * dark mode but the user has explicitly set mode: 'light'.
   */
  useLayoutEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;

    // When in auto mode, respect any existing host overrides (like global dark mode toggles)
    const appliedTheme = resolveAppliedTheme(effectiveTheme);
    const targetTheme = theme === 'auto' ? appliedTheme : effectiveTheme;

    // Always normalize the root theme classes so the document never ends up
    // with both `light` and `dark` attached at the same time.
    root.classList.remove('light', 'dark');
    root.classList.add(targetTheme);

    // Track which theme DayFlow applied for other consumers if needed
    // Use a unique dataset key to avoid clashing with next-themes or other libraries
    if (theme === 'auto') {
      if (root.dataset.dfThemeOverride) {
        delete root.dataset.dfThemeOverride;
      }
    } else if (root.dataset.dfThemeOverride !== targetTheme) {
      root.dataset.dfThemeOverride = targetTheme;
    }

    // Set data attribute for CSS selectors, using a scoped name
    if (root.dataset.dfTheme !== targetTheme) {
      root.dataset.dfTheme = targetTheme;
    }
  }, [effectiveTheme, theme, systemTheme]);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const variables = getThemeColorCssVariables(colors);
    const keys = Object.keys(variables);
    const previous = new Map(
      keys.map(key => [
        key,
        {
          value: root.style.getPropertyValue(key),
          priority: root.style.getPropertyPriority(key),
        },
      ])
    );

    keys.forEach(key => {
      root.style.setProperty(key, variables[key]);
    });

    return () => {
      keys.forEach(key => {
        const previousValue = previous.get(key);
        if (!previousValue?.value) {
          root.style.removeProperty(key);
          return;
        }
        root.style.setProperty(
          key,
          previousValue.value,
          previousValue.priority
        );
      });
    };
  }, [colors]);

  /**
   * Notify parent of theme changes
   */
  useEffect(() => {
    if (onThemeChange) {
      onThemeChange(theme, effectiveTheme);
    }
  }, [theme, effectiveTheme, onThemeChange]);

  const value: ThemeContextType = useMemo(
    () => ({
      theme,
      effectiveTheme,
      setTheme,
    }),
    [theme, effectiveTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
