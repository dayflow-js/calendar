import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ChangeDetectionStrategy,
  TemplateRef,
  ChangeDetectorRef,
} from '@angular/core';
import {
  CalendarRenderer,
  ICalendarApp,
  CalendarApp,
  CalendarAppConfig,
  UseCalendarAppReturn,
  CustomRendering,
} from '@dayflow/core';

@Component({
  selector: 'dayflow-calendar',
  template: `
    <div #container class="df-calendar-wrapper"></div>

    <!-- Hidden area to render Angular templates before they are portaled -->
    <div style="display: none">
      <ng-container
        *ngFor="let rendering of customRenderings; trackBy: trackById"
      >
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
  @Input() eventContent?: TemplateRef<any>;
  @Input() eventDetailContent?: TemplateRef<any>;
  @Input() eventDetailDialog?: TemplateRef<any>;
  @Input() headerContent?: TemplateRef<any>;
  @Input() createCalendarDialog?: TemplateRef<any>;
  @Input() titleBarSlot?: TemplateRef<any>;
  @Input() colorPicker?: TemplateRef<any>;
  @Input() colorPickerWrapper?: TemplateRef<any>;
  @Input() collapsedSafeAreaLeft?: number;

  @ViewChild('container') container!: ElementRef<HTMLElement>;

  customRenderings: CustomRendering[] = [];
  private renderer?: CalendarRenderer;
  private unsubscribe?: () => void;
  private internalApp?: ICalendarApp;

  constructor(private cdr: ChangeDetectorRef) {}

  private get app(): ICalendarApp {
    if (this.internalApp) return this.internalApp;

    if (this.calendar instanceof CalendarApp) {
      return this.calendar;
    }

    if ((this.calendar as any).app) {
      return (this.calendar as any).app;
    }

    // If it's a config object, we create an internal instance
    if (typeof (this.calendar as any).views !== 'undefined') {
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
    if (!this.container || !this.calendar) return;

    this.renderer = new CalendarRenderer(this.app);
    this.renderer.setProps({
      collapsedSafeAreaLeft: this.collapsedSafeAreaLeft,
    });
    this.renderer.mount(this.container.nativeElement);

    this.unsubscribe = this.renderer
      .getCustomRenderingStore()
      .subscribe(renderings => {
        this.customRenderings = Array.from(renderings.values());
        this.cdr.markForCheck();
      });
  }

  private destroyCalendar() {
    if (this.unsubscribe) this.unsubscribe();
    if (this.renderer) this.renderer.unmount();
    this.unsubscribe = undefined;
    this.renderer = undefined;
  }

  getTemplate(name: string): TemplateRef<any> | null {
    // Switch avoids allocating a new Record on every change-detection cycle.
    switch (name) {
      case 'eventContent': return this.eventContent ?? null;
      case 'eventDetailContent': return this.eventDetailContent ?? null;
      case 'eventDetailDialog': return this.eventDetailDialog ?? null;
      case 'headerContent': return this.headerContent ?? null;
      case 'createCalendarDialog': return this.createCalendarDialog ?? null;
      case 'titleBarSlot': return this.titleBarSlot ?? null;
      case 'colorPicker': return this.colorPicker ?? null;
      case 'colorPickerWrapper': return this.colorPickerWrapper ?? null;
      default: return null;
    }
  }

  trackById(_index: number, item: CustomRendering) {
    return item.id;
  }
}
