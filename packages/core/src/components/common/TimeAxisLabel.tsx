import type { JSX } from 'preact';

import { useLocale } from '@/locale';
import { formatTime } from '@/utils/timeUtils';

export interface TimeAxisLabelProps {
  hour: number;
  minute?: number;
  timeFormat?: '12h' | '24h';
}

export const TimeAxisLabel = ({
  hour,
  minute = 0,
  timeFormat = '24h',
}: TimeAxisLabelProps): JSX.Element => {
  const { t } = useLocale();
  if (timeFormat === '24h') {
    return <>{formatTime(hour, minute, '24h')}</>;
  }

  const normalizedHour = Math.floor(hour) % 24;
  if (normalizedHour === 12 && minute === 0) {
    return (
      <span className='df-time-axis-label' data-12h='true'>
        <span className='df-time-axis-num'>{t('noon')}</span>
      </span>
    );
  }

  const h12 = normalizedHour % 12 || 12;
  const period = normalizedHour >= 12 ? 'pm' : 'am';
  const minuteStr =
    minute === 0 ? '' : `:${minute.toString().padStart(2, '0')}`;

  return (
    <span className='df-time-axis-label' data-12h='true'>
      <span className='df-time-axis-num'>
        {h12}
        {minuteStr}
      </span>
      <span className='df-time-axis-unit'>{period}</span>
    </span>
  );
};
