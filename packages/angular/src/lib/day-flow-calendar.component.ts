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
  ChangeDetectorRef
} from '@angular/core';
import { 
  CalendarRenderer, 
  ICalendarApp, 
  UseCalendarAppReturn, 
  CustomRendering 
} from '@dayflow/core';

@Component({
  selector: 'dayflow-calendar',
  template: `
    <div #container class="df-calendar-wrapper"></div>
    
    <!-- Hidden area to render Angular templates before they are portaled -->
    <div style="display: none">
      <ng-container *ngFor="let rendering of customRenderings; trackBy: trackById">
        <div *ngIf="getTemplate(rendering.generatorName)" [dayflowPortal]="rendering.containerEl">
          <ng-container *ngTemplateOutlet="getTemplate(rendering.generatorName)!; context: { $implicit: rendering.generatorArgs }"></ng-container>
        </div>
      </ng-container>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DayFlowCalendarComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() calendar!: ICalendarApp | UseCalendarAppReturn;

  // Templates for custom content injection
  @Input() eventContent?: TemplateRef<any>;
  @Input() eventDetailContent?: TemplateRef<any>;
  @Input() eventDetailDialog?: TemplateRef<any>;
  @Input() headerContent?: TemplateRef<any>;
  @Input() createCalendarDialog?: TemplateRef<any>;
  @Input() titleBarSlot?: TemplateRef<any>;
  @Input() colorPicker?: TemplateRef<any>;
  @Input() colorPickerWrapper?: TemplateRef<any>;

  @ViewChild('container') container!: ElementRef<HTMLElement>;

  customRenderings: CustomRendering[] = [];
  private renderer?: CalendarRenderer;
  private unsubscribe?: () => void;

  constructor(private cdr: ChangeDetectorRef) {}

  private get app(): ICalendarApp {
    return (this.calendar as any).app || this.calendar;
  }

  ngAfterViewInit() {
    this.initCalendar();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['calendar'] && !changes['calendar'].firstChange) {
      this.destroyCalendar();
      this.initCalendar();
    }
  }

  ngOnDestroy() {
    this.destroyCalendar();
  }

  private initCalendar() {
    if (!this.container || !this.calendar) return;

    this.renderer = new CalendarRenderer(this.app);
    this.renderer.mount(this.container.nativeElement);

    this.unsubscribe = this.renderer.getCustomRenderingStore().subscribe((renderings) => {
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
    const templates: Record<string, TemplateRef<any> | undefined> = {
      eventContent: this.eventContent,
      eventDetailContent: this.eventDetailContent,
      eventDetailDialog: this.eventDetailDialog,
      headerContent: this.headerContent,
      createCalendarDialog: this.createCalendarDialog,
      titleBarSlot: this.titleBarSlot,
      colorPicker: this.colorPicker,
      colorPickerWrapper: this.colorPickerWrapper
    };
    return templates[name] || null;
  }

  trackById(index: number, item: CustomRendering) {
    return item.id;
  }
}
