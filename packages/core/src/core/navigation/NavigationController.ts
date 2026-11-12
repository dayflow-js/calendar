import { Temporal } from 'temporal-polyfill';

import {
  startOfCalendarMonth,
  addCalendarMonths,
  dateToCalendarDate,
  calendarDateToDate,
} from '@/calendar/calendarSystem';
import {
  CalendarAppState,
  CalendarCallbacks,
  CalendarView,
  CalendarViewType,
  RangeChangeReason,
  ViewType,
  VisibleRangePayload,
} from '@/types';
import { getWeekRange } from '@/utils/dateRangeUtils';

export class NavigationController {
  private visibleMonth: Date;
  private visibleRangeListeners: Set<(payload: VisibleRangePayload) => void> =
    new Set();

  private static getAgendaPageDays(view?: CalendarView): number {
    const pageDays = Number(view?.config?.daysToShow);
    return Number.isFinite(pageDays) && pageDays > 0
      ? Math.floor(pageDays)
      : 14;
  }

  constructor(
    private state: CalendarAppState,
    private getCallbacks: () => CalendarCallbacks,
    private notify: () => void,
    initialDate: Date
  ) {
    this.visibleMonth = startOfCalendarMonth(
      initialDate,
      this.state.calendarSystem
    );
  }

  changeView(view: CalendarViewType): void {
    if (!this.state.views.has(view)) {
      throw new Error(`View ${view} is not registered`);
    }
    this.state.currentView = view;
    this.state.highlightedEventId = null;
    this.getCallbacks().onViewChange?.(view);
    this.handleVisibleRangeChange('viewChange');
    this.notify();
  }

  getCurrentView(): CalendarView {
    const view = this.state.views.get(this.state.currentView);
    if (!view) {
      throw new Error(
        `Current view ${this.state.currentView} is not registered`
      );
    }
    return view;
  }

  subscribeVisibleRangeChange(
    listener: (payload: VisibleRangePayload) => void
  ): () => void {
    this.visibleRangeListeners.add(listener);
    return () => this.visibleRangeListeners.delete(listener);
  }

  emitVisibleRange(
    start: Date,
    end: Date,
    reason: RangeChangeReason = 'navigation'
  ): void {
    this.getCallbacks().onVisibleRangeChange?.(
      new Date(start),
      new Date(end),
      reason
    );
    const payload: VisibleRangePayload = {
      start: new Date(start),
      end: new Date(end),
      reason,
      view: this.state.currentView,
    };
    this.visibleRangeListeners.forEach(listener => listener(payload));
  }

  handleVisibleRangeChange(reason: RangeChangeReason): void {
    const view = this.state.views.get(this.state.currentView);
    switch (view?.type) {
      case ViewType.DAY: {
        const start = new Date(this.state.currentDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        this.emitVisibleRange(start, end, reason);
        break;
      }
      case ViewType.WEEK: {
        const startOfWeek = (view?.config?.startOfWeek as number) ?? 1;
        const { monday } = getWeekRange(this.state.currentDate, startOfWeek);
        const start = new Date(monday);
        const end = new Date(monday);
        end.setDate(end.getDate() + 7);
        this.emitVisibleRange(start, end, reason);
        break;
      }
      case ViewType.GANTT: {
        const startOfWeek = (view?.config?.startOfWeek as number) ?? 1;
        const { monday } = getWeekRange(this.state.currentDate, startOfWeek);
        const start = new Date(monday);
        start.setDate(start.getDate() - 14);
        const end = new Date(start);
        end.setDate(end.getDate() + 56);
        this.emitVisibleRange(start, end, reason);
        break;
      }
      case ViewType.MONTH: {
        if (reason === 'navigation') {
          // MonthView emits its own range based on virtual scroll position
          break;
        }
        const firstDayOfMonth = startOfCalendarMonth(
          this.state.currentDate,
          this.state.calendarSystem
        );
        const startOfWeek = (view?.config?.startOfWeek as number) ?? 1;
        const { monday } = getWeekRange(firstDayOfMonth, startOfWeek);
        const start = new Date(monday);
        const end = new Date(monday);
        end.setDate(end.getDate() + 42);
        this.emitVisibleRange(start, end, reason);
        break;
      }
      case ViewType.AGENDA: {
        const start = new Date(this.state.currentDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(
          end.getDate() + NavigationController.getAgendaPageDays(view)
        );
        this.emitVisibleRange(start, end, reason);
        break;
      }
      case ViewType.YEAR: {
        const year = dateToCalendarDate(
          this.state.currentDate,
          this.state.calendarSystem
        ).year;
        const start = calendarDateToDate(
          { year, month: 1, day: 1 },
          this.state.calendarSystem
        );
        start.setHours(0, 0, 0, 0);
        const end = calendarDateToDate(
          { year: year + 1, month: 1, day: 1 },
          this.state.calendarSystem
        );
        this.emitVisibleRange(start, end, reason);
        break;
      }
      default:
        break;
    }
  }

  setCurrentDate(date: Date): void {
    this.state.currentDate = new Date(date);
    this.getCallbacks().onDateChange?.(this.state.currentDate);
    this.setVisibleMonth(this.state.currentDate);
    this.handleVisibleRangeChange('navigation');
    this.notify();
  }

  getCurrentDate(): Date {
    return new Date(this.state.currentDate);
  }

  setVisibleMonth(date: Date): void {
    const next = startOfCalendarMonth(date, this.state.calendarSystem);
    if (this.visibleMonth.getTime() === next.getTime()) {
      return;
    }
    this.visibleMonth = next;
    this.notify();
  }

  getVisibleMonth(): Date {
    return new Date(this.visibleMonth);
  }

  goToToday(): void {
    const todayInTz = Temporal.Now.plainDateISO(this.state.timeZone);
    const today = new Date(todayInTz.year, todayInTz.month - 1, todayInTz.day);
    this.setCurrentDate(today);
  }

  goToPrevious(): void {
    const newDate = new Date(this.state.currentDate);
    switch (this.state.currentView) {
      case ViewType.DAY:
        newDate.setDate(newDate.getDate() - 1);
        break;
      case ViewType.WEEK:
      case ViewType.GANTT:
        newDate.setDate(newDate.getDate() - 7);
        break;
      case ViewType.MONTH:
        newDate.setTime(
          addCalendarMonths(newDate, -1, this.state.calendarSystem).getTime()
        );
        break;
      case ViewType.AGENDA: {
        const view = this.state.views.get(this.state.currentView);
        newDate.setDate(
          newDate.getDate() - NavigationController.getAgendaPageDays(view)
        );
        break;
      }
      case ViewType.YEAR:
        newDate.setTime(
          addCalendarMonths(newDate, -12, this.state.calendarSystem).getTime()
        );
        break;
      default:
        break;
    }
    this.setCurrentDate(newDate);
  }

  goToNext(): void {
    const newDate = new Date(this.state.currentDate);
    switch (this.state.currentView) {
      case ViewType.DAY:
        newDate.setDate(newDate.getDate() + 1);
        break;
      case ViewType.WEEK:
      case ViewType.GANTT:
        newDate.setDate(newDate.getDate() + 7);
        break;
      case ViewType.MONTH:
        newDate.setTime(
          addCalendarMonths(newDate, 1, this.state.calendarSystem).getTime()
        );
        break;
      case ViewType.AGENDA: {
        const view = this.state.views.get(this.state.currentView);
        newDate.setDate(
          newDate.getDate() + NavigationController.getAgendaPageDays(view)
        );
        break;
      }
      case ViewType.YEAR:
        newDate.setTime(
          addCalendarMonths(newDate, 12, this.state.calendarSystem).getTime()
        );
        break;
      default:
        break;
    }
    this.setCurrentDate(newDate);
  }

  selectDate(date: Date): void {
    this.setCurrentDate(date);
    this.getCallbacks().onDateChange?.(new Date(date));
  }
}
