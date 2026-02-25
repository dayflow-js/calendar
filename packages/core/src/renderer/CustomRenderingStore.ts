export interface CustomRendering {
  id: string;
  containerEl: HTMLElement; // The placeholder div created by Preact
  generatorName: string; // e.g. 'eventContent', 'titleBarSlot'
  generatorArgs: unknown; // Arguments passed to the framework-specific generator
}

export type CustomRenderingListener = (
  map: Map<string, CustomRendering>
) => void;

export class CustomRenderingStore {
  private renderings = new Map<string, CustomRendering>();
  private overrides = new Set<string>();
  private listeners = new Set<CustomRenderingListener>();

  constructor(initialOverrides?: string[]) {
    if (initialOverrides && initialOverrides.length > 0) {
      this.overrides = new Set(initialOverrides);
    }
  }

  /**
   * Register a new custom rendering placeholder.
   * Called by the ContentSlot Preact component.
   */
  register(rendering: CustomRendering): void {
    this.renderings.set(rendering.id, rendering);
    this.notify();
  }

  /**
   * Unregister a custom rendering placeholder.
   */
  unregister(id: string): void {
    if (this.renderings.delete(id)) {
      this.notify();
    }
  }

  /**
   * Set the list of generator names that have custom overrides.
   * Called by framework adapters (React/Vue/etc.)
   */
  setOverrides(names: string[]): void {
    this.overrides = new Set(names);
    this.notify();
  }

  /**
   * Check if a specific generator has a custom override.
   */
  isOverridden(generatorName: string): boolean {
    return this.overrides.has(generatorName);
  }

  /**
   * Subscribe to updates of the renderings map.
   * Called by the framework adapter (React/Vue/etc.)
   */
  subscribe(listener: CustomRenderingListener): () => void {
    this.listeners.add(listener);
    // Initial sync
    listener(this.renderings);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(fn => fn(this.renderings));
  }
}
