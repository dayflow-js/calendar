import React from 'react';
import { YearViewProps } from '@/types';
import { DefaultYearView } from '@/components/yearView/DefaultYearView';
import { FixedWeekYearView } from '@/components/yearView/FixedWeekYearView';

const YearView: React.FC<YearViewProps> = (props) => {
  const mode = props.config?.mode || 'year-canvas';

  if (mode === 'fixed-week') {
    return <FixedWeekYearView {...props} />;
  }

  return <DefaultYearView {...props} />;
};

export default YearView;
