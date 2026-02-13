import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DayFlowCalendarComponent } from './day-flow-calendar.component';
import { DayFlowPortalDirective } from './day-flow-portal.directive';

@NgModule({
  declarations: [
    DayFlowCalendarComponent,
    DayFlowPortalDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    DayFlowCalendarComponent,
    DayFlowPortalDirective
  ]
})
export class DayFlowCalendarModule { }
