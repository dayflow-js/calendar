import { LOCALES, SupportedLang } from './locales';

/**
 * Normalizes a locale string to a supported language code.
 * e.g., 'en-US' -> 'en', 'zh-CN' -> 'zh'
 */
export function normalizeLocale(locale: string): SupportedLang {
  const lang = locale.split('-')[0].toLowerCase();

  if (lang in LOCALES) {
    return lang as SupportedLang;
  }

  return 'en';
}

/**
 * Checks if a string is a valid locale identifier.
 */
export function isValidLocale(locale: string): boolean {
  try {
    new Intl.DateTimeFormat(locale);
    return true;
  } catch (e) {
    return false;
  }
}
