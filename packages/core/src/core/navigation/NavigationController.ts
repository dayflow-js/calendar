import { Temporal } from 'temporal-polyfill';

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
    this.visibleMonth = new Date(
      initialDate.getFullYear(),
      initialDate.getMonth(),
      1
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
      case ViewType.MONTH: {
        if (reason === 'navigation') {
          // MonthView emits its own range based on virtual scroll position
          break;
        }
        const firstDayOfMonth = new Date(
          this.state.currentDate.getFullYear(),
          this.state.currentDate.getMonth(),
          1
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
        const start = new Date(this.state.currentDate.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(this.state.currentDate.getFullYear(), 11, 31);
        end.setDate(end.getDate() + 1);
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
    const next = new Date(date.getFullYear(), date.getMonth(), 1);
    if (
      this.visibleMonth.getFullYear() === next.getFullYear() &&
      this.visibleMonth.getMonth() === next.getMonth()
    ) {
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
        newDate.setDate(newDate.getDate() - 7);
        break;
      case ViewType.MONTH:
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case ViewType.AGENDA: {
        const view = this.state.views.get(this.state.currentView);
        newDate.setDate(
          newDate.getDate() - NavigationController.getAgendaPageDays(view)
        );
        break;
      }
      case ViewType.YEAR:
        newDate.setFullYear(newDate.getFullYear() - 1);
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
        newDate.setDate(newDate.getDate() + 7);
        break;
      case ViewType.MONTH:
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case ViewType.AGENDA: {
        const view = this.state.views.get(this.state.currentView);
        newDate.setDate(
          newDate.getDate() + NavigationController.getAgendaPageDays(view)
        );
        break;
      }
      case ViewType.YEAR:
        newDate.setFullYear(newDate.getFullYear() + 1);
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
