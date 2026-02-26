import {
  ElementRef,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  Directive,
  Input,
} from '@angular/core';

@Directive({
  selector: '[dayflowPortal]',
})
export class DayFlowPortalDirective implements OnChanges, OnDestroy {
  @Input('dayflowPortal') targetEl!: HTMLElement;

  constructor(private el: ElementRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['targetEl'] && this.targetEl) {
      this.targetEl.append(this.el.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.el.nativeElement.parentNode === this.targetEl) {
      this.el.nativeElement.remove();
    }
  }
}
