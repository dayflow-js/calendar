import { h, createContext } from 'preact';
import { useContext, useEffect, useState, useCallback } from 'preact/hooks';
import { ThemeMode } from '../types/calendarTypes';
import { resolveAppliedTheme } from '../utils/themeUtils';

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
  children: any;
  /** Initial theme mode */
  initialTheme?: ThemeMode;
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
  onThemeChange,
}: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme as ThemeMode);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  // Compute effective theme (resolve 'auto' to actual theme)
  const effectiveTheme: 'light' | 'dark' = theme === 'auto' ? systemTheme : theme;

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

    // Initial check on mount
    const initialSystemTheme = mediaQuery.matches ? 'dark' : 'light';
    setSystemTheme(initialSystemTheme);

    // Listen for changes
    // Use addEventListener if available (modern browsers), fallback to addListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      // @ts-ignore - deprecated but needed for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        // @ts-ignore - deprecated but needed for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  /**
   * Apply theme to document root
   */
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;

    // When in auto mode, respect any existing host overrides (like global dark mode toggles)
    const appliedTheme = resolveAppliedTheme(effectiveTheme);
    const targetTheme = theme === 'auto' ? appliedTheme : effectiveTheme;

    // Remove both classes first to avoid duplicates
    root.classList.remove('light', 'dark');
    root.classList.add(targetTheme);

    // Track which theme DayFlow applied for other consumers if needed
    if (theme === 'auto') {
      root.removeAttribute('data-dayflow-theme-override');
    } else {
      root.setAttribute('data-dayflow-theme-override', targetTheme);
    }

    // Set data attribute for CSS selectors
    root.setAttribute('data-theme', targetTheme);

  }, [effectiveTheme, theme, systemTheme]);

  /**
   * Notify parent of theme changes
   */
  useEffect(() => {
    if (onThemeChange) {
      onThemeChange(theme, effectiveTheme);
    }
  }, [theme, effectiveTheme, onThemeChange]);

  const value: ThemeContextType = {
    theme,
    effectiveTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
