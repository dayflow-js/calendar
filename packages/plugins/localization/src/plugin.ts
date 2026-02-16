import { CalendarPlugin, ICalendarApp, Locale, registerLocale } from '@dayflow/core';

export interface LocalizationConfig {
  locales: Locale[];
}

/**
 * Creates a localization plugin to register additional locales.
 * 
 * @param config Plugin configuration containing locales to register
 * @returns A CalendarPlugin instance
 */
export function createLocalizationPlugin(config: LocalizationConfig): CalendarPlugin {
  return {
    name: 'localization',
    install(app: ICalendarApp) {
      if (config.locales) {
        config.locales.forEach(locale => {
          registerLocale(locale);
        });
      }
      
      // Trigger a re-render to apply new locales
      app.triggerRender();
    }
  };
}
