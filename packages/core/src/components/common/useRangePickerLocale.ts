import { useMemo } from 'preact/hooks';

import { useLocale } from '@/locale';
import type { Locale } from '@/locale/types';

/** Locale for RangePicker, carrying the translated labels it reads from `messages`. */
export const useRangePickerLocale = (appLocale?: string | Locale): Locale => {
  const { t } = useLocale();
  return useMemo(() => {
    const code =
      typeof appLocale === 'string' ? appLocale : appLocale?.code || 'en-US';
    return {
      code,
      messages: {
        previousYear: t('previousYear'),
        previousMonth: t('previousMonth'),
        nextMonth: t('nextMonth'),
        nextYear: t('nextYear'),
        startDate: t('startDate'),
        endDate: t('endDate'),
        hour: t('hour'),
        minute: t('minute'),
        ok: t('ok'),
      },
    };
  }, [appLocale, t]);
};
