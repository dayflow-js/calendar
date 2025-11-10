import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ThemeMode } from '@/types/calendarTypes';

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
  children: React.ReactNode;
  /** Initial theme mode */
  initialTheme?: ThemeMode;
  /** Callback when theme changes */
  onThemeChange?: (theme: ThemeMode, effectiveTheme: 'light' | 'dark') => void;
}

/**
 * Get system theme preference
 */
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
};

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
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = 'light',
  onThemeChange,
}) => {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  // Compute effective theme (resolve 'auto' to actual theme)
  const effectiveTheme: 'light' | 'dark' = theme === 'auto' ? systemTheme : theme;

  /**
   * Sync initialTheme prop changes to internal state
   */
  useEffect(() => {
    setThemeState(initialTheme);
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

    // Initial check
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

    // Remove both classes first
    root.classList.remove('light', 'dark');

    // Add the effective theme class
    root.classList.add(effectiveTheme);

    // Also set data attribute for CSS selectors
    root.setAttribute('data-theme', effectiveTheme);

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

/**
 * Use Theme Hook
 *
 * Access current theme and theme control functions.
 * Must be used within a ThemeProvider.
 *
 * @returns Theme context value
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, effectiveTheme, setTheme } = useTheme();
 *
 *   return (
 *     <button onClick={() => setTheme(effectiveTheme === 'light' ? 'dark' : 'light')}>
 *       Toggle Theme
 *     </button>
 *   );
 * }
 * ```
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
