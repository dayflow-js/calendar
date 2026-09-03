/**
 * Angular adapter: `TemplateRef` inputs in, `ngTemplateOutlet` + a portal
 * directive out.
 *
 * The lifecycle rules are shared with every other adapter (see
 * `test-kit`); the template plumbing is Angular-specific.
 */
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  createFakeApp,
  createdRenderers,
  initialOverrides,
  lifecycleLog,
  resetCoreFake,
  expectUnsubscribeBeforeUnmount,
  expectNoEmptyEmitAfterMount,
  expectAdapterContract,
} from '@test-kit';
import type { FakeApp } from '@test-kit';

import { DayFlowCalendarComponent } from '../lib/day-flow-calendar.component';
import { DayFlowCalendarModule } from '../lib/day-flow-calendar.module';

@Component({
  standalone: false,
  template: `
    <ng-template #titleTpl let-args>
      <span data-testid="title-bar">my toolbar:{{ args.slot }}</span>
    </ng-template>
    <ng-template #headerTpl>
      <span data-testid="header">the header</span>
    </ng-template>

    <dayflow-calendar
      [calendar]="calendar"
      [titleBarSlot]="withTitle ? titleTpl : undefined"
      [calendarHeader]="withHeader ? headerTpl : undefined"
    ></dayflow-calendar>
  `,
})
class HostComponent {
  @ViewChild(DayFlowCalendarComponent)
  calendarComponent!: DayFlowCalendarComponent;

  calendar: unknown = null;
  withTitle = true;
  withHeader = false;
}

describe('DayFlowCalendarComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let app: FakeApp;

  /**
   * Angular 19+ only refreshes views that are marked dirty. These tests mutate
   * host state from outside the Angular zone, so nothing marks the view for us.
   */
  const sync = () => {
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  };

  const setup = (
    options: { withTitle?: boolean; withHeader?: boolean } = {}
  ) => {
    fixture = TestBed.createComponent(HostComponent);
    app = createFakeApp();
    fixture.componentInstance.calendar = app;
    fixture.componentInstance.withTitle = options.withTitle ?? true;
    fixture.componentInstance.withHeader = options.withHeader ?? false;
    sync();
    return fixture;
  };

  beforeEach(async () => {
    resetCoreFake();
    await TestBed.configureTestingModule({
      declarations: [HostComponent],
      imports: [DayFlowCalendarModule],
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('mount', () => {
    it('renders the wrapper div and mounts a renderer', () => {
      setup();

      expect(
        fixture.nativeElement.querySelector('.df-calendar-wrapper')
      ).not.toBeNull();
      expect(createdRenderers).toHaveLength(1);
    });

    it('derives overrides from the templates it was given', () => {
      setup({ withTitle: true, withHeader: false });

      const overrides = initialOverrides(lifecycleLog);
      expect(overrides).toEqual(['titleBarSlot']);
    });

    it('pushes the overrides onto the app', () => {
      setup();

      expect(app.overrides).toEqual(['titleBarSlot']);
    });

    it('portals the template output into the placeholder', () => {
      setup();
      sync();

      const placeholder = document.querySelector('[data-slot="titleBarSlot"]');
      expect(placeholder).not.toBeNull();
      expect(placeholder?.textContent).toContain('my toolbar');
    });

    it('passes the generator args into the template context', () => {
      setup();
      sync();

      const el = document.querySelector('[data-testid="title-bar"]');
      expect(el?.textContent?.trim()).toBe('my toolbar:titleBarSlot');
    });

    it('renders each registered template independently', () => {
      setup({ withTitle: true, withHeader: true });
      sync();

      expect(
        document.querySelector('[data-slot="titleBarSlot"]')?.textContent
      ).toContain('my toolbar');
      expect(
        document.querySelector('[data-slot="calendarHeader"]')?.textContent
      ).toContain('the header');
    });

    it('renders nothing for a placeholder with no matching template', () => {
      setup();

      const el = document.createElement('div');
      createdRenderers[0].getCustomRenderingStore().register({
        id: 'orphan',
        containerEl: el,
        generatorName: 'gridPopupContent',
        generatorArgs: {},
      });
      sync();

      expect(el.childNodes).toHaveLength(0);
    });
  });

  describe('updates', () => {
    it('pushes new overrides when a template input appears', () => {
      setup({ withTitle: true, withHeader: false });

      fixture.componentInstance.withHeader = true;
      sync();

      const storeUpdates = lifecycleLog.filter(e => e.type === 'setOverrides');
      expect(storeUpdates.at(-1)).toMatchObject({
        overrides: ['titleBarSlot', 'calendarHeader'],
      });
      expect(app.overrides).toEqual(['titleBarSlot', 'calendarHeader']);
    });

    it('drops an override when its template input goes away', () => {
      setup({ withTitle: true, withHeader: true });

      fixture.componentInstance.withHeader = false;
      sync();

      expect(app.overrides).toEqual(['titleBarSlot']);
    });
  });

  describe('teardown', () => {
    it('unsubscribes before unmounting the renderer', () => {
      setup();

      fixture.destroy();

      expectUnsubscribeBeforeUnmount(lifecycleLog);
    });

    it('never hands the adapter an empty map after mount', () => {
      setup();
      fixture.destroy();

      expectNoEmptyEmitAfterMount(lifecycleLog);
    });
  });

  describe('conformance', () => {
    it('satisfies the shared contract on mount and destroy', () => {
      setup();
      fixture.destroy();

      expectAdapterContract(lifecycleLog);
    });
  });
});
