import { registerLocale } from '@dayflow/core';
import type { Locale as CoreLocale } from '@dayflow/core';

import type {
  DayflowLocale,
  LocaleMessages,
  LocaleNamespace,
} from './locales/types';

export interface LocalizationHost {
  registerLocale?: unknown;
  triggerRender?: unknown;
}

export type LocalizationPluginCleanup = () => void;

export interface LocalizationPlugin {
  name: string;
  install: (app: LocalizationHost) => LocalizationPluginCleanup | undefined;
}

export interface LocalizationConfig {
  locales: DayflowLocale[];
  /**
   * Locale message namespace to register for app-level registries.
   *
   * `messages` is the default DayFlow calendar namespace. Package-specific
   * surfaces can add entries under `packages`, for example `scheduler` today
   * and `gantt` later.
   */
  namespace?: LocaleNamespace;
}

const CORE_NAMESPACE = 'core';
const DEFAULT_APP_REGISTRY_NAMESPACE = 'scheduler';

function hasAppLocaleRegistry(
  app: LocalizationHost
): app is LocalizationHost & {
  registerLocale: (locale: DayflowLocale) => void;
} {
  return typeof app.registerLocale === 'function';
}

export function getLocaleMessages(
  locale: DayflowLocale,
  namespace: LocaleNamespace = CORE_NAMESPACE
): LocaleMessages {
  if (namespace === CORE_NAMESPACE) {
    return locale.messages;
  }

  return {
    ...locale.messages,
    ...locale.packages?.[namespace],
  };
}

export function createLocaleForNamespace(
  locale: DayflowLocale,
  namespace?: LocaleNamespace
): DayflowLocale {
  return {
    code: locale.code,
    messages: getLocaleMessages(locale, namespace),
  };
}

/**
 * Creates a localization plugin to register additional locales.
 *
 * Calendar apps use the default `messages` namespace. Apps with their own
 * locale registry, such as scheduler, can use package namespaces:
 * `createLocalizationPlugin({ locales, namespace: 'scheduler' })`.
 *
 * @param config Plugin configuration containing locales to register
 * @returns A localization plugin instance
 */
export function createLocalizationPlugin(
  config: LocalizationConfig
): LocalizationPlugin {
  return {
    name: 'localization',
    install(app: LocalizationHost) {
      const namespace =
        config.namespace ??
        (hasAppLocaleRegistry(app)
          ? DEFAULT_APP_REGISTRY_NAMESPACE
          : CORE_NAMESPACE);

      if (config.locales) {
        config.locales.forEach(locale => {
          const scopedLocale = createLocaleForNamespace(locale, namespace);

          if (hasAppLocaleRegistry(app)) {
            app.registerLocale(scopedLocale);
          } else {
            registerLocale(scopedLocale as CoreLocale);
          }
        });
      }

      if (typeof app.triggerRender === 'function') {
        app.triggerRender();
      }

      // oxlint-disable-next-line unicorn/no-useless-undefined
      return undefined;
    },
  };
}
