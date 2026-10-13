import { CalendarAppState, CalendarPlugin, ICalendarApp } from '@/types';
import { logger } from '@/utils/logger';

export class PluginManager {
  private cleanups = new Map<string, () => void>();
  private tornDown = new Set<string>();

  constructor(
    private state: CalendarAppState,
    private notify: () => void
  ) {}

  install(plugin: CalendarPlugin, app: ICalendarApp): void {
    if (this.state.plugins.has(plugin.name)) {
      logger.warn(`Plugin ${plugin.name} is already installed`);
      return;
    }
    this.state.plugins.set(plugin.name, plugin);
    this.runInstall(plugin, app);
  }

  private runInstall(plugin: CalendarPlugin, app: ICalendarApp): void {
    const cleanup = plugin.install(app);
    if (typeof cleanup === 'function') {
      this.cleanups.set(plugin.name, cleanup);
    }
  }

  /**
   * Run plugin cleanups, last installed first. Plugins stay registered so the
   * app keeps answering hasPlugin/getPlugin, and restore() can re-arm them.
   */
  destroy(): void {
    const pending = [...this.cleanups];
    this.cleanups.clear();
    for (let i = pending.length - 1; i >= 0; i -= 1) {
      const [name, cleanup] = pending[i];
      this.tornDown.add(name);
      try {
        cleanup();
      } catch (error) {
        logger.error(`Plugin ${name} cleanup failed`, error);
      }
    }
  }

  /**
   * Re-install the plugins destroy() tore down. Plugins without a cleanup were
   * never torn down, so they are left alone rather than installed twice.
   */
  restore(app: ICalendarApp): void {
    if (this.tornDown.size === 0) return;
    const names = this.tornDown;
    this.tornDown = new Set();
    this.state.plugins.forEach(plugin => {
      if (names.has(plugin.name)) this.runInstall(plugin, app);
    });
  }

  getPlugin<T = unknown>(name: string): T | undefined {
    const plugin = this.state.plugins.get(name);
    return plugin?.api as T;
  }

  hasPlugin(name: string): boolean {
    return this.state.plugins.has(name);
  }

  getPluginConfig(pluginName: string): Record<string, unknown> {
    const plugin = this.state.plugins.get(pluginName);
    return plugin?.config || {};
  }

  updatePluginConfig(
    pluginName: string,
    config: Record<string, unknown>
  ): void {
    const plugin = this.state.plugins.get(pluginName);
    if (plugin) {
      plugin.config = { ...plugin.config, ...config };
      plugin.updateConfig?.(config);
      this.notify();
    }
  }
}
