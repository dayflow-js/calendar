import React from 'react';
import { CalendarApp } from '@/core';
import { EventDetailContentRenderer, EventDetailDialogRenderer } from '@/types';
import { DefaultYearView } from '@/components/yearView/DefaultYearView';
import { FixedWeekYearView } from '@/components/yearView/FixedWeekYearView';

interface YearViewProps {
  app: CalendarApp;
  calendarRef: React.RefObject<HTMLDivElement>;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any;
}

const YearView: React.FC<YearViewProps> = (props) => {
  const mode = props.config?.mode || 'year-canvas';

  if (mode === 'fixed-week') {
    return <FixedWeekYearView {...props} config={props.config} />;
  }

  return <DefaultYearView {...props} config={props.config} />;
};

export default YearView;

