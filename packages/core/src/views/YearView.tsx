import { DefaultYearView } from '@/components/yearView/DefaultYearView';
import { FixedWeekYearView } from '@/components/yearView/FixedWeekYearView';
import { GridYearView } from '@/components/yearView/GridYearView';
import { YearViewProps } from '@/types';

const YearView = (props: YearViewProps) => {
  const mode = props.config?.mode || 'year-canvas';

  if (mode === 'fixed-week') {
    return <FixedWeekYearView {...props} />;
  }

  if (mode === 'grid') {
    return <GridYearView app={props.app} config={props.config} />;
  }

  return <DefaultYearView {...props} />;
};

export default YearView;
