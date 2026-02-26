import {
  ElementRef,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  TemplateRef,
  ChangeDetectorRef,
  Component,
  Input,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import type {
  ICalendarApp,
  CalendarAppConfig,
  UseCalendarAppReturn,
  CustomRendering,
} from '@dayflow/core';
import { CalendarRenderer, CalendarApp } from '@dayflow/core';

@Component({
  selector: 'dayflow-calendar',
  template: `
    <div #container class="df-calendar-wrapper"></div>

    <!-- Hidden area to render Angular templates before they are portaled -->
    <div style="display: none">
      <ng-container *ngFor="let rendering of customRenderings; trackBy: trackById">
        <div
          *ngIf="getTemplate(rendering.generatorName)"
          [dayflowPortal]="rendering.containerEl"
        >
          <ng-container
            *ngTemplateOutlet="
              getTemplate(rendering.generatorName)!;
              context: { $implicit: rendering.generatorArgs }
            "
          ></ng-container>
        </div>
      </ng-container>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayFlowCalendarComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() calendar!: ICalendarApp | UseCalendarAppReturn | CalendarAppConfig;

  // Templates for custom content injection
  @Input() eventContent?: TemplateRef<unknown>;
  @Input() eventDetailContent?: TemplateRef<unknown>;
  @Input() eventDetailDialog?: TemplateRef<unknown>;
  @Input() headerContent?: TemplateRef<unknown>;
  @Input() createCalendarDialog?: TemplateRef<unknown>;
  @Input() titleBarSlot?: TemplateRef<unknown>;
  @Input() colorPicker?: TemplateRef<unknown>;
  @Input() colorPickerWrapper?: TemplateRef<unknown>;
  @Input() collapsedSafeAreaLeft?: number;

  @ViewChild('container') container!: ElementRef<HTMLElement>;

  customRenderings: CustomRendering[] = [];
  private renderer?: CalendarRenderer;
  private unsubscribe?: () => void;
  private internalApp?: ICalendarApp;

  constructor(private cdr: ChangeDetectorRef) {}

  private get app(): ICalendarApp {
    if (this.internalApp) {
      return this.internalApp;
    }

    if (this.calendar instanceof CalendarApp) {
      return this.calendar;
    }

    if ((this.calendar as { app?: ICalendarApp; views?: unknown[] }).app) {
      return (this.calendar as { app?: ICalendarApp; views?: unknown[] }).app!;
    }

    // If it's a config object, we create an internal instance
    if (
      (this.calendar as { app?: ICalendarApp; views?: unknown[] }).views !==
      undefined
    ) {
      this.internalApp = new CalendarApp(this.calendar as CalendarAppConfig);
      return this.internalApp;
    }

    return this.calendar as ICalendarApp;
  }

  ngAfterViewInit() {
    this.initCalendar();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['calendar'] && !changes['calendar'].firstChange) {
      this.internalApp = undefined;
      this.destroyCalendar();
      this.initCalendar();
    } else if (changes['collapsedSafeAreaLeft'] && this.renderer) {
      this.renderer.setProps({
        collapsedSafeAreaLeft: this.collapsedSafeAreaLeft,
      });
    }
  }

  ngOnDestroy() {
    this.destroyCalendar();
  }

  private initCalendar() {
    if (!this.container || !this.calendar) {
      return;
    }

    this.renderer = new CalendarRenderer(this.app);
    this.renderer.setProps({
      collapsedSafeAreaLeft: this.collapsedSafeAreaLeft,
    });
    this.renderer.mount(this.container.nativeElement);

    this.unsubscribe = this.renderer
      .getCustomRenderingStore()
      .subscribe(renderings => {
        this.customRenderings = [...renderings.values()];
        this.cdr.markForCheck();
      });
  }

  private destroyCalendar() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.renderer) {
      this.renderer.unmount();
    }
    this.unsubscribe = undefined;
    this.renderer = undefined;
  }

  getTemplate(name: string): TemplateRef<unknown> | null {
    // Switch avoids allocating a new Record on every change-detection cycle.
    switch (name) {
      case 'eventContent': {
        return this.eventContent ?? null;
      }
      case 'eventDetailContent': {
        return this.eventDetailContent ?? null;
      }
      case 'eventDetailDialog': {
        return this.eventDetailDialog ?? null;
      }
      case 'headerContent': {
        return this.headerContent ?? null;
      }
      case 'createCalendarDialog': {
        return this.createCalendarDialog ?? null;
      }
      case 'titleBarSlot': {
        return this.titleBarSlot ?? null;
      }
      case 'colorPicker': {
        return this.colorPicker ?? null;
      }
      case 'colorPickerWrapper': {
        return this.colorPickerWrapper ?? null;
      }
      default: {
        return null;
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  trackById(_index: number, item: CustomRendering) {
    return item.id;
  }
}
