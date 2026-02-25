import { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';

import { getWeekDaysLabels, getMonthLabels } from './intl';
import { LocaleContext } from './LocaleContext';
import { t as translate } from './translator';
import type {
  LocaleCode,
  LocaleMessages,
  TranslationKey,
  Locale,
} from './types';
import { isValidLocale } from './utils';

export interface LocaleProviderProps {
  locale?: LocaleCode | Locale;
  messages?: LocaleMessages;
  children?: ComponentChildren;
}

export const LocaleProvider = ({
  locale = 'en-US',
  messages,
  children,
}: LocaleProviderProps) => {
  const resolvedLocale = useMemo(() => {
    if (typeof locale === 'string') {
      const code = isValidLocale(locale) ? locale : 'en-US';
      return { code, messages: undefined };
    }

    // If it's a Locale object, ensure its code is valid
    if (
      locale &&
      typeof locale !== 'string' &&
      !isValidLocale((locale as Locale).code)
    ) {
      return { ...(locale as Locale), code: 'en-US' as LocaleCode };
    }

    return locale || { code: 'en-US' };
  }, [locale]);

  const value = useMemo(() => {
    const currentCode = resolvedLocale.code;

    return {
      locale: currentCode,
      t: (key: TranslationKey, vars?: Record<string, string>) => {
        // Resolve text: 1. Custom messages -> 2. Locale object messages -> 3. Global fallback
        let text =
          messages?.[key] ??
          resolvedLocale.messages?.[key] ??
          translate(key, currentCode);

        // 4. Replace variables if any
        if (vars) {
          Object.entries(vars).forEach(([k, v]) => {
            text = text.replaceAll(new RegExp(`{${k}}`, 'g'), v);
          });
        }

        return text;
      },
      getWeekDaysLabels,
      getMonthLabels,
      isDefault: false,
    };
  }, [resolvedLocale, messages]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
};
