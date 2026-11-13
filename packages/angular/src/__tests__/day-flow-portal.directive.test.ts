/**
 * The portal directive is what actually moves Angular-rendered nodes out of the
 * hidden staging area and into the core's placeholder <div>.
 */
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DayFlowCalendarModule } from '../lib/day-flow-calendar.module';

@Component({
  standalone: false,
  template: `
    <div style="display: none">
      <div *ngIf="visible" [dayflowPortal]="target">
        <span data-testid="portaled">moved</span>
      </div>
    </div>
  `,
})
class HostComponent {
  target: HTMLElement = document.createElement('div');
  visible = true;
}

describe('DayFlowPortalDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  /**
   * Angular 19+ only refreshes views that are marked dirty. These tests mutate
   * host state from outside the Angular zone, so nothing marks the view for us.
   */
  const sync = () => {
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HostComponent],
      imports: [DayFlowCalendarModule],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('moves the host element into the target on first binding', () => {
    const { target } = fixture.componentInstance;
    sync();

    expect(target.querySelector('[data-testid="portaled"]')).not.toBeNull();
    // It must leave the staging area, not be copied into both places.
    expect(
      fixture.nativeElement.querySelector('[data-testid="portaled"]')
    ).toBeNull();
  });

  it('moves the element again when the target changes', () => {
    sync();
    const first = fixture.componentInstance.target;
    const second = document.createElement('div');

    fixture.componentInstance.target = second;
    sync();

    expect(second.querySelector('[data-testid="portaled"]')).not.toBeNull();
    expect(first.querySelector('[data-testid="portaled"]')).toBeNull();
  });

  it('removes the element from the target on destroy', () => {
    sync();
    const { target } = fixture.componentInstance;
    expect(target.childNodes.length).toBe(1);

    fixture.componentInstance.visible = false;
    sync();

    expect(target.childNodes.length).toBe(0);
  });

  it('leaves a target it no longer owns untouched on destroy', () => {
    // After the target switches, destroying the directive must not reach back
    // into the old container and remove something it does not own.
    sync();
    const first = fixture.componentInstance.target;
    const stranger = document.createElement('span');
    first.append(stranger);

    fixture.componentInstance.target = document.createElement('div');
    sync();
    fixture.componentInstance.visible = false;
    sync();

    expect(first.contains(stranger)).toBe(true);
  });
});
