import { 
  Directive, 
  Input, 
  ElementRef, 
  OnChanges, 
  SimpleChanges, 
  OnDestroy 
} from '@angular/core';

@Directive({
  selector: '[dayflowPortal]'
})
export class DayFlowPortalDirective implements OnChanges, OnDestroy {
  @Input('dayflowPortal') targetEl!: HTMLElement;

  constructor(private el: ElementRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['targetEl'] && this.targetEl) {
      this.targetEl.appendChild(this.el.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.el.nativeElement.parentNode === this.targetEl) {
      this.targetEl.removeChild(this.el.nativeElement);
    }
  }
}
