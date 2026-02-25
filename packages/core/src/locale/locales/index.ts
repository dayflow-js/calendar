import { Locale } from '@/locale/types';

import en from './en';

export { en };

/**
 * Global locale registry for the core library.
 * Default includes English.
 */
export const LOCALES: Record<string, Locale> = {
  en,
};

export type SupportedLang = string;

/**
 * Registers a new locale in the global registry.
 * This allows plugins to provide additional translations.
 *
 * @param locale The locale object to register
 */
export function registerLocale(locale: Locale) {
  const lang = locale.code.split('-')[0].toLowerCase();
  LOCALES[lang] = locale;
}
