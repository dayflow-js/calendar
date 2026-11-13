import {
  ElementRef,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  Directive,
  Input,
  inject,
} from '@angular/core';

@Directive({
  standalone: false,
  selector: '[dayflowPortal]',
})
export class DayFlowPortalDirective implements OnChanges, OnDestroy {
  @Input('dayflowPortal') targetEl!: HTMLElement;

  private el = inject(ElementRef);

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
