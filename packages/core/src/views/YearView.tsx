import { DefaultYearView } from '@/components/yearView/DefaultYearView';
import { FixedWeekYearView } from '@/components/yearView/FixedWeekYearView';
import { YearViewProps } from '@/types';

const YearView = (props: YearViewProps) => {
  const mode = props.config?.mode || 'year-canvas';

  if (mode === 'fixed-week') {
    return <FixedWeekYearView {...props} />;
  }

  return <DefaultYearView {...props} />;
};

export default YearView;
