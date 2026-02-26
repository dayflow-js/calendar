import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { DayFlowCalendarComponent } from './day-flow-calendar.component';
import { DayFlowPortalDirective } from './day-flow-portal.directive';

@NgModule({
  declarations: [DayFlowCalendarComponent, DayFlowPortalDirective],
  imports: [CommonModule],
  exports: [DayFlowCalendarComponent, DayFlowPortalDirective],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DayFlowCalendarModule {}
