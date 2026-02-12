import { render, h } from 'preact';
import { ICalendarApp } from '../types';
import { CustomRenderingStore } from './CustomRenderingStore';
import { CustomRenderingContext } from './CustomRenderingContext';
import { CalendarRoot } from './CalendarRoot';

export class CalendarRenderer {
  private container: HTMLElement | null = null;
  private customRenderingStore = new CustomRenderingStore();
  private unsubscribe: (() => void) | null = null;
  private renderRequested = false;

  constructor(private app: ICalendarApp) {
    // Subscribe to app state changes to trigger Preact re-renders
    this.unsubscribe = app.subscribe(() => this.requestRender());
  }

  private requestRender(): void {
    if (this.renderRequested) return;
    this.renderRequested = true;
    requestAnimationFrame(() => {
      this.render();
      this.renderRequested = false;
    });
  }

  /**
   * Mount the calendar to a DOM container.
   */
  mount(container: HTMLElement): void {
    this.container = container;
    this.requestRender();
  }

  /**
   * Unmount the calendar and cleanup.
   */
  unmount(): void {
    if (this.container) {
      render(null, this.container);
      this.container = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  getCustomRenderingStore(): CustomRenderingStore {
    return this.customRenderingStore;
  }

  private render(): void {
    if (!this.container) return;

    render(
      h(CustomRenderingContext.Provider, {
        value: this.customRenderingStore,
      }, h(CalendarRoot, { app: this.app })),
      this.container
    );
  }
}
