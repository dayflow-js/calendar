import { LOCALES } from './locales';
import { normalizeLocale } from './utils';
import { getIntlLabel, capitalize } from './intl';
import type { TranslationKey, LocaleCode } from './types';

/**
 * Core translation function.
 * 1. Try Intl API for standard terms.
 * 2. Fall back to language-specific dictionary.
 * 3. Fall back to English dictionary.
 * 4. Fall back to the key itself.
 */
export function t(key: TranslationKey, locale: LocaleCode = 'en-US'): string {
  // 1. Try Intl API for specific keys
  if (['today', 'day', 'week', 'month', 'year'].includes(key)) {
    const intl = getIntlLabel(key as any, locale);
    if (intl) return capitalize(intl);
  }

  // 2. Dictionary Lookup
  const lang = normalizeLocale(locale);
  const localeObj = LOCALES[lang];
  const text = localeObj?.messages?.[key];

  if (text) return text;

  // 3. Fallback to English
  const enMessages = LOCALES.en.messages;
  return enMessages?.[key] || key;
}
