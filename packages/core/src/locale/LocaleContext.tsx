import { createContext } from 'preact';
import type { LocaleCode, TranslationKey } from './types';

export interface LocaleContextValue {
  locale: LocaleCode;
  t: (key: TranslationKey, vars?: Record<string, string>) => string;
  getWeekDaysLabels: (locale: string, format?: 'long' | 'short' | 'narrow') => string[];
  getMonthLabels: (locale: string, format?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit') => string[];
  isDefault?: boolean;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en-US',
  t: (key) => key,
  getWeekDaysLabels: () => [],
  getMonthLabels: () => [],
  isDefault: true,
});
