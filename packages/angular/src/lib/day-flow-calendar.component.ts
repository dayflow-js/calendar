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
  CalendarAppConfigSyncSnapshot,
  UseCalendarAppReturn,
  CustomRendering,
  EventDetailContentProps,
  EventDetailDialogProps,
  CreateCalendarDialogProps,
  TitleBarSlotProps,
  EventContentSlotArgs,
  ColorPickerProps,
  CreateCalendarDialogColorPickerProps,
  CalendarHeaderProps,
  EventContextMenuSlotArgs,
  GridContextMenuSlotArgs,
  CalendarSearchProps,
} from '@dayflow/core';
import {
  CalendarRenderer,
  CalendarApp,
  createConfigSyncSnapshot,
  createNormalizedCalendarAppConfigGetter,
  syncCalendarAppConfig,
} from '@dayflow/core';

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
  @Input() eventContentDay?: TemplateRef<EventContentSlotArgs>;
  @Input() eventContentWeek?: TemplateRef<EventContentSlotArgs>;
  @Input() eventContentMonth?: TemplateRef<EventContentSlotArgs>;
  @Input() eventContentYear?: TemplateRef<EventContentSlotArgs>;
  @Input() eventContentAllDayDay?: TemplateRef<EventContentSlotArgs>;
  @Input() eventContentAllDayWeek?: TemplateRef<EventContentSlotArgs>;
  @Input() eventContentAllDayMonth?: TemplateRef<EventContentSlotArgs>;
  @Input() eventContentAllDayYear?: TemplateRef<EventContentSlotArgs>;
  @Input() eventDetailContent?: TemplateRef<EventDetailContentProps>;
  @Input() eventDetailDialog?: TemplateRef<EventDetailDialogProps>;
  @Input() createCalendarDialog?: TemplateRef<CreateCalendarDialogProps>;
  @Input() titleBarSlot?: TemplateRef<TitleBarSlotProps>;
  @Input() colorPicker?: TemplateRef<ColorPickerProps>;
  @Input()
  createCalendarDialogColorPicker?: TemplateRef<CreateCalendarDialogColorPickerProps>;
  @Input() calendarHeader?: TemplateRef<CalendarHeaderProps>;
  @Input() eventContextMenu?: TemplateRef<EventContextMenuSlotArgs>;
  @Input() gridContextMenu?: TemplateRef<GridContextMenuSlotArgs>;
  @Input() collapsedSafeAreaLeft?: number;
  @Input() useEventDetailPanel?: boolean;
  @Input() search?: CalendarSearchProps;

  @ViewChild('container') container!: ElementRef<HTMLElement>;

  customRenderings: CustomRendering[] = [];
  private renderer?: CalendarRenderer;
  private unsubscribe?: () => void;
  private internalApp?: CalendarApp;
  private getNormalizedInternalConfig?: () => CalendarAppConfig;
  private internalConfigSyncSnapshot?: CalendarAppConfigSyncSnapshot;

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
    if (DayFlowCalendarComponent.isCalendarConfig(this.calendar)) {
      return this.getOrCreateInternalApp();
    }

    return this.calendar as ICalendarApp;
  }

  ngAfterViewInit() {
    this.initCalendar();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['calendar'] && !changes['calendar'].firstChange) {
      if (this.canSyncInternalCalendarConfig(changes['calendar'])) {
        this.syncInternalCalendarConfig();
      } else {
        this.resetInternalCalendarState();
        this.destroyCalendar();
        this.initCalendar();
      }
    } else if (this.renderer) {
      if (
        changes['collapsedSafeAreaLeft'] ||
        changes['useEventDetailPanel'] ||
        changes['search']
      ) {
        this.renderer.setProps(this.getRendererProps());
      }
      const slotKeys = [
        'eventContentDay',
        'eventContentWeek',
        'eventContentMonth',
        'eventContentYear',
        'eventContentAllDayDay',
        'eventContentAllDayWeek',
        'eventContentAllDayMonth',
        'eventContentAllDayYear',
        'eventDetailContent',
        'eventDetailDialog',
        'createCalendarDialog',
        'titleBarSlot',
        'colorPicker',
        'createCalendarDialogColorPicker',
        'calendarHeader',
        'eventContextMenu',
        'gridContextMenu',
      ];
      if (slotKeys.some(key => changes[key])) {
        const activeOverrides = this.getActiveOverrides();
        this.renderer.getCustomRenderingStore().setOverrides(activeOverrides);
        this.app.setOverrides(activeOverrides);
      }
    }
  }

  ngOnDestroy() {
    this.destroyCalendar();
  }

  private getRendererProps(): Record<string, unknown> {
    return {
      collapsedSafeAreaLeft: this.collapsedSafeAreaLeft,
      useEventDetailPanel: this.useEventDetailPanel,
      search: this.search,
    };
  }

  private initCalendar() {
    if (!this.container || !this.calendar) {
      return;
    }

    const activeOverrides = this.getActiveOverrides();
    this.renderer = new CalendarRenderer(this.app, activeOverrides);
    this.renderer.setProps(this.getRendererProps());
    this.renderer.mount(this.container.nativeElement);
    this.app.setOverrides(activeOverrides);

    this.unsubscribe = this.renderer
      .getCustomRenderingStore()
      .subscribe(renderings => {
        this.customRenderings = [...renderings.values()];
        this.cdr.markForCheck();
      });
  }

  private getActiveOverrides(): string[] {
    const templateInputs: Record<string, TemplateRef<unknown> | undefined> = {
      eventContentDay: this.eventContentDay,
      eventContentWeek: this.eventContentWeek,
      eventContentMonth: this.eventContentMonth,
      eventContentYear: this.eventContentYear,
      eventContentAllDayDay: this.eventContentAllDayDay,
      eventContentAllDayWeek: this.eventContentAllDayWeek,
      eventContentAllDayMonth: this.eventContentAllDayMonth,
      eventContentAllDayYear: this.eventContentAllDayYear,
      eventDetailContent: this.eventDetailContent,
      eventDetailDialog: this.eventDetailDialog,
      createCalendarDialog: this.createCalendarDialog,
      titleBarSlot: this.titleBarSlot,
      colorPicker: this.colorPicker,
      createCalendarDialogColorPicker: this.createCalendarDialogColorPicker,
      calendarHeader: this.calendarHeader,
      eventContextMenu: this.eventContextMenu,
      gridContextMenu: this.gridContextMenu,
    };
    return Object.keys(templateInputs).filter(
      key => templateInputs[key] !== null && templateInputs[key] !== undefined
    );
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

  private static isCalendarConfig(value: unknown): value is CalendarAppConfig {
    return (
      !!value &&
      typeof value === 'object' &&
      'views' in value &&
      !('app' in value)
    );
  }

  private getOrCreateInternalApp(): CalendarApp {
    if (!this.internalApp) {
      this.getNormalizedInternalConfig =
        createNormalizedCalendarAppConfigGetter(
          () => this.calendar as CalendarAppConfig
        );
      const normalizedConfig = this.getNormalizedInternalConfig();
      this.internalApp = new CalendarApp(normalizedConfig);
      this.internalConfigSyncSnapshot =
        createConfigSyncSnapshot(normalizedConfig);
    }

    return this.internalApp;
  }

  private canSyncInternalCalendarConfig(
    change: SimpleChanges['calendar']
  ): boolean {
    return (
      DayFlowCalendarComponent.isCalendarConfig(change.currentValue) &&
      DayFlowCalendarComponent.isCalendarConfig(change.previousValue) &&
      !!this.internalApp &&
      !!this.getNormalizedInternalConfig &&
      !!this.internalConfigSyncSnapshot
    );
  }

  private syncInternalCalendarConfig() {
    if (
      !this.internalApp ||
      !this.getNormalizedInternalConfig ||
      !this.internalConfigSyncSnapshot
    ) {
      return;
    }

    this.internalConfigSyncSnapshot = syncCalendarAppConfig(
      this.internalApp,
      this.internalConfigSyncSnapshot,
      this.getNormalizedInternalConfig()
    );
  }

  private resetInternalCalendarState() {
    this.internalApp = undefined;
    this.getNormalizedInternalConfig = undefined;
    this.internalConfigSyncSnapshot = undefined;
  }

  getTemplate(name: string): TemplateRef<unknown> | null {
    // Switch avoids allocating a new Record on every change-detection cycle.
    switch (name) {
      case 'eventContentDay': {
        return this.eventContentDay ?? null;
      }
      case 'eventContentWeek': {
        return this.eventContentWeek ?? null;
      }
      case 'eventContentMonth': {
        return this.eventContentMonth ?? null;
      }
      case 'eventContentYear': {
        return this.eventContentYear ?? null;
      }
      case 'eventContentAllDayDay': {
        return this.eventContentAllDayDay ?? null;
      }
      case 'eventContentAllDayWeek': {
        return this.eventContentAllDayWeek ?? null;
      }
      case 'eventContentAllDayMonth': {
        return this.eventContentAllDayMonth ?? null;
      }
      case 'eventContentAllDayYear': {
        return this.eventContentAllDayYear ?? null;
      }
      case 'eventDetailContent': {
        return this.eventDetailContent ?? null;
      }
      case 'eventDetailDialog': {
        return this.eventDetailDialog ?? null;
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
      case 'createCalendarDialogColorPicker': {
        return this.createCalendarDialogColorPicker ?? null;
      }
      case 'calendarHeader': {
        return this.calendarHeader ?? null;
      }
      case 'eventContextMenu': {
        return this.eventContextMenu ?? null;
      }
      case 'gridContextMenu': {
        return this.gridContextMenu ?? null;
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
