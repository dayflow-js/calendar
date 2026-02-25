import { render, h } from 'preact';

import { ICalendarApp } from '@/types';
import { isDeepEqual } from '@/utils/compareUtils';

import { CalendarRoot } from './CalendarRoot';
import { CustomRenderingContext } from './CustomRenderingContext';
import { CustomRenderingStore } from './CustomRenderingStore';

export class CalendarRenderer {
  private container: HTMLElement | null = null;
  private customRenderingStore: CustomRenderingStore;
  private unsubscribe: (() => void) | null = null;
  private renderRequested = false;
  private extraProps: Record<string, unknown> = {};

  constructor(
    private app: ICalendarApp,
    initialOverrides?: string[]
  ) {
    this.customRenderingStore = new CustomRenderingStore(initialOverrides);
    // Subscribe to app state changes to trigger Preact re-renders
    this.unsubscribe = app.subscribe(() => this.requestRender());
  }

  setProps(props: Record<string, unknown>): void {
    if (isDeepEqual(this.extraProps, props)) return;
    this.extraProps = props;
    this.requestRender();
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
      h(
        CustomRenderingContext.Provider,
        {
          value: this.customRenderingStore,
        },
        h(CalendarRoot, { app: this.app, ...this.extraProps })
      ),
      this.container
    );
  }
}
